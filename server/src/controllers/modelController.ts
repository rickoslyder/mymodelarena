import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import fetch from "node-fetch";
// Import the type definition for ModelPrice if not already globally available via Prisma
// import { ModelPrice } from '@prisma/client'; // Removed explicit import

// Define the expected shape of the price data locally if needed,
// or rely on Prisma's inferred types if client generation is working.
// For safety, let's define it.
interface ModelPriceData {
  id: string;
  Provider: string;
  ModelID: string;
  CanonicalID: string;
  ContextWindow: number;
  InputUSDPer1M: number;
  OutputUSDPer1M: number;
  Notes: string | null;
  Date: Date;
}

// Helper function to get pricing from LiteLLM proxy
const LITELLM_PROXY_URL = process.env.LITELLM_PROXY_URL || "https://openai-proxy-0l7e.onrender.com";
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

interface LiteLLMPriceData {
  inputCostPerToken: number;
  outputCostPerToken: number;
}

async function getLiteLLMPricing(
  modelId: string
): Promise<LiteLLMPriceData | null> {
  if (!modelId || !LITELLM_MASTER_KEY) return null;
  
  try {
    const response = await fetch(`${LITELLM_PROXY_URL}/v1/model/info?model=${encodeURIComponent(modelId)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${LITELLM_MASTER_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      console.warn(`LiteLLM pricing lookup failed for ${modelId}: ${response.status}`);
      return null;
    }

    const data = await response.json();
    const modelInfo = data.data?.[0]?.model_info;
    
    if (modelInfo?.input_cost_per_token && modelInfo?.output_cost_per_token) {
      return {
        inputCostPerToken: modelInfo.input_cost_per_token,
        outputCostPerToken: modelInfo.output_cost_per_token,
      };
    }
    
    return null;
  } catch (error) {
    console.warn(`LiteLLM pricing lookup failed for ${modelId}:`, error);
    return null; // Don't block model creation if pricing lookup fails
  }
}

// Helper function to get latest price (internal call) - DEPRECATED, use LiteLLM instead
// Use the locally defined type or Prisma's inferred type if available
async function getLatestPriceInternal(
  modelId: string
): Promise<ModelPriceData | null> {
  if (!modelId) return null;
  try {
    // Use direct property access - requires prisma generate to have run successfully
    const latestPrice = await prisma.modelPrice.findFirst({
      where: {
        OR: [{ ModelID: modelId }, { CanonicalID: modelId }],
      },
      orderBy: {
        Date: "desc",
      },
    });

    // Cast the result if necessary, or handle potential type mismatch
    const latestPriceData = latestPrice as ModelPriceData | null;

    if (latestPriceData) {
      // Ensure we return the absolute latest for the canonical ID
      const latestCanonicalPrice = await prisma.modelPrice.findFirst({
        where: { CanonicalID: latestPriceData.CanonicalID },
        orderBy: { Date: "desc" },
      });
      return (latestCanonicalPrice as ModelPriceData | null) || latestPriceData; // Fallback just in case
    } else {
      return null;
    }
  } catch (error) {
    console.error(`Internal pricing lookup failed for ${modelId}:`, error);
    return null; // Don't block model creation if pricing lookup fails
  }
}

// Input type for creating a model (updated for LiteLLM integration)
interface CreateModelInput {
  name: string;
  baseUrl?: string; // Optional: defaults to LiteLLM proxy
  apiKeyEnvVar?: string; // Optional: LiteLLM proxy handles authentication
  provider?: string; // Optional: Helps categorize
  modelIdentifier: string; // Required: Used by LiteLLM proxy and for pricing lookup
  inputTokenCost?: number; // Make optional, will try to auto-fetch
  outputTokenCost?: number; // Make optional, will try to auto-fetch
}

export const createModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    name,
    baseUrl,
    apiKeyEnvVar,
    provider,
    modelIdentifier,
    inputTokenCost: inputCostFromRequest,
    outputTokenCost: outputCostFromRequest,
  } = req.body as CreateModelInput;

  // --- Basic Validation ---
  // Only require name and modelIdentifier for LiteLLM integration
  if (!name || !modelIdentifier) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Missing required fields: name, modelIdentifier",
      },
    });
  }

  // Use defaults for LiteLLM integration
  const finalBaseUrl = baseUrl || LITELLM_PROXY_URL;
  const finalApiKeyEnvVar = apiKeyEnvVar || "LITELLM_MASTER_KEY";

  // Check if the specified API key environment variable exists on the server (only if not using LiteLLM)
  if (apiKeyEnvVar && !process.env[apiKeyEnvVar]) {
    return res.status(400).json({
      success: false,
      error: {
        message: `API Key environment variable '${apiKeyEnvVar}' not found on the server.`,
      },
    });
  }

  // For LiteLLM proxy, ensure master key is available
  if (!apiKeyEnvVar && !LITELLM_MASTER_KEY) {
    return res.status(400).json({
      success: false,
      error: {
        message: "LITELLM_MASTER_KEY not configured. Cannot create model using LiteLLM proxy.",
      },
    });
  }
  // DO NOT log or return the actual key!

  // --- Attempt to fetch pricing from LiteLLM (preferred) then fallback to static database ---
  let fetchedInputCost: number | null = null;
  let fetchedOutputCost: number | null = null;
  let priceFetchWarning: string | null = null;

  if (modelIdentifier) {
    // First try LiteLLM proxy for real-time pricing
    const litellmPricing = await getLiteLLMPricing(modelIdentifier);
    
    if (litellmPricing) {
      fetchedInputCost = litellmPricing.inputCostPerToken;
      fetchedOutputCost = litellmPricing.outputCostPerToken;
      console.log(`Fetched real-time pricing from LiteLLM for ${modelIdentifier}`);
    } else {
      // Fallback to static database pricing
      console.log(`LiteLLM pricing unavailable for ${modelIdentifier}, trying static database...`);
      const priceData = await getLatestPriceInternal(modelIdentifier);
      if (priceData) {
        fetchedInputCost = priceData.InputUSDPer1M / 1_000_000; // Convert per 1M to per token
        fetchedOutputCost = priceData.OutputUSDPer1M / 1_000_000; // Convert per 1M to per token
        console.log(`Fetched pricing from static database for ${modelIdentifier}`);
      } else {
        priceFetchWarning = `Could not automatically fetch pricing for identifier: ${modelIdentifier}. Please enter costs manually.`;
      }
    }
  } else {
    priceFetchWarning =
      "No model identifier provided. Pricing cannot be fetched automatically.";
  }

  // Determine final costs: use request values if provided, otherwise use fetched values (or default/error if neither)
  const finalInputCost = inputCostFromRequest ?? fetchedInputCost;
  const finalOutputCost = outputCostFromRequest ?? fetchedOutputCost;

  // Validate costs *after* attempting to fetch
  if (finalInputCost === null || finalOutputCost === null) {
    return res.status(400).json({
      success: false,
      error: {
        message: `Could not determine token costs. ${
          priceFetchWarning || "Please provide costs manually."
        }`,
      },
    });
  }
  if (finalInputCost <= 0 || finalOutputCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Token costs must be positive numbers." },
    });
  }

  try {
    const newModel = await prisma.model.create({
      data: {
        name,
        baseUrl: finalBaseUrl,
        apiKeyEnvVar: finalApiKeyEnvVar,
        provider: provider || null, // Store if provided
        modelIdentifier: modelIdentifier, // Required field
        inputTokenCost: finalInputCost,
        outputTokenCost: finalOutputCost,
      },
    });
    // Return the created model data (excluding sensitive info if any)
    // Include the warning if price fetching failed
    res.status(201).json({
      success: true,
      data: newModel,
      ...(priceFetchWarning && { warning: priceFetchWarning }),
    });
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
};

// Add other controller functions here (getAllModels, getModelById, updateModel, deleteModel)
export const getAllModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = await prisma.model.findMany({
      // Optionally select fields to exclude sensitive data if needed in future
      // select: { id: true, name: true, baseUrl: true, inputTokenCost: true, outputTokenCost: true, createdAt: true, updatedAt: true }
      orderBy: {
        createdAt: "desc", // Default sort order
      },
    });
    res.status(200).json({ success: true, data: models });
  } catch (error) {
    next(error);
  }
};

export const getModelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    const model = await prisma.model.findUniqueOrThrow({
      where: { id },
      // select: { ... } // Optional field selection
    });
    res.status(200).json({ success: true, data: model });
  } catch (error) {
    // Let the central error handler manage Prisma's RecordNotFound error (P2025)
    next(error);
  }
};

// Input type for updating a model (allow partial updates)
interface UpdateModelInput {
  name?: string;
  baseUrl?: string;
  apiKeyEnvVar?: string;
  provider?: string;
  modelIdentifier?: string;
  inputTokenCost?: number;
  outputTokenCost?: number;
}

export const updateModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const {
    name,
    baseUrl,
    apiKeyEnvVar,
    provider,
    modelIdentifier,
    inputTokenCost,
    outputTokenCost,
  } = req.body as UpdateModelInput;

  // --- Basic Validation ---
  if (
    !name &&
    !baseUrl &&
    !apiKeyEnvVar &&
    !provider &&
    !modelIdentifier &&
    inputTokenCost === undefined &&
    outputTokenCost === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: { message: "No update fields provided." },
    });
  }

  if (inputTokenCost !== undefined && inputTokenCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Input token cost must be a positive number." },
    });
  }
  if (outputTokenCost !== undefined && outputTokenCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Output token cost must be a positive number." },
    });
  }

  if (apiKeyEnvVar && !process.env[apiKeyEnvVar]) {
    return res.status(400).json({
      success: false,
      error: {
        message: `API Key environment variable '${apiKeyEnvVar}' not found on the server.`,
      },
    });
  }

  try {
    const updatedModel = await prisma.model.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(baseUrl !== undefined && { baseUrl }),
        ...(apiKeyEnvVar !== undefined && { apiKeyEnvVar }),
        ...(provider !== undefined && { provider }),
        ...(modelIdentifier !== undefined && { modelIdentifier }),
        ...(inputTokenCost !== undefined && { inputTokenCost }),
        ...(outputTokenCost !== undefined && { outputTokenCost }),
        updatedAt: new Date(),
      },
    });
    res.status(200).json({ success: true, data: updatedModel });
  } catch (error) {
    next(error);
  }
};

export const deleteModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    // Optional: Add check here to prevent deleting models with associated responses/runs if needed
    // const responsesExist = await prisma.response.findFirst({ where: { modelId: id } });
    // if (responsesExist) { ... return 409 Conflict ... }

    await prisma.model.delete({
      where: { id },
    });
    // Send No Content success status
    res.status(204).send();
  } catch (error) {
    // Handles potential P2025 (Record to delete not found)
    next(error);
  }
};

// Get suggested models from LiteLLM proxy for easy model creation
export const getSuggestedModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  if (!LITELLM_MASTER_KEY) {
    return res.status(500).json({
      success: false,
      error: { message: "LiteLLM master key not configured" },
    });
  }

  try {
    const response = await fetch(`${LITELLM_PROXY_URL}/v1/model/info`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${LITELLM_MASTER_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LiteLLM suggested models API error: ${response.status}`, errorText);
      return res.status(response.status).json({
        success: false,
        error: { 
          message: `Failed to fetch suggested models from LiteLLM proxy: ${response.statusText}`,
          details: errorText.substring(0, 200)
        },
      });
    }

    const data = await response.json();
    
    // Transform the response to make it easier to use in the frontend
    const suggestedModels = (data.data || []).map((model: any) => ({
      modelIdentifier: model.model_name,
      displayName: model.model_name,
      provider: extractProvider(model.model_name),
      hasRealTimePricing: !!(model.model_info?.input_cost_per_token && model.model_info?.output_cost_per_token),
      maxTokens: model.model_info?.max_tokens || model.model_info?.max_input_tokens,
      inputCostPerToken: model.model_info?.input_cost_per_token,
      outputCostPerToken: model.model_info?.output_cost_per_token,
    })).filter((model: any) => model.modelIdentifier); // Filter out any invalid entries

    res.status(200).json({
      success: true,
      data: suggestedModels,
    });
  } catch (error: any) {
    console.error("Error fetching suggested models from LiteLLM proxy:", error);
    next(error);
  }
};

// Helper function to extract provider from model name
function extractProvider(modelName: string): string {
  if (!modelName) return "unknown";
  
  // Common patterns in LiteLLM model names
  if (modelName.includes("gpt-") || modelName.includes("openai")) return "openai";
  if (modelName.includes("claude") || modelName.includes("anthropic")) return "anthropic";
  if (modelName.includes("gemini") || modelName.includes("google")) return "google";
  if (modelName.includes("mistral")) return "mistral";
  if (modelName.includes("llama")) return "meta";
  if (modelName.includes("groq")) return "groq";
  if (modelName.includes("deepseek")) return "deepseek";
  if (modelName.includes("grok") || modelName.includes("xai")) return "xai";
  
  // Check for provider prefix format (provider/model)
  const parts = modelName.split("/");
  if (parts.length > 1) {
    return parts[0].toLowerCase();
  }
  
  return "custom";
}
