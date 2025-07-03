import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

/**
 * Controller for LiteLLM proxy integration endpoints
 */

const LITELLM_PROXY_URL = process.env.LITELLM_PROXY_URL || "https://openai-proxy-0l7e.onrender.com";
const LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

interface LiteLLMModelInfo {
  model_name: string;
  litellm_params?: any;
  model_info?: {
    id?: string;
    key?: string;
    max_tokens?: number;
    max_input_tokens?: number;
    max_output_tokens?: number;
    input_cost_per_token?: number;
    output_cost_per_token?: number;
    [key: string]: any;
  };
}

/**
 * Fetch available models from LiteLLM proxy
 */
export const getAvailableModels = async (
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
      console.error(`LiteLLM model info API error: ${response.status}`, errorText);
      return res.status(response.status).json({
        success: false,
        error: { 
          message: `Failed to fetch models from LiteLLM proxy: ${response.statusText}`,
          details: errorText.substring(0, 200)
        },
      });
    }

    const data = await response.json() as { data: LiteLLMModelInfo[] };
    
    // Transform the LiteLLM response to our expected format
    const models = (data.data || []).map((model: LiteLLMModelInfo) => ({
      name: model.model_name,
      modelIdentifier: model.model_name,
      provider: extractProvider(model.model_name),
      maxTokens: model.model_info?.max_tokens || model.model_info?.max_input_tokens,
      inputCostPerToken: model.model_info?.input_cost_per_token,
      outputCostPerToken: model.model_info?.output_cost_per_token,
      litellmParams: model.litellm_params,
      modelInfo: model.model_info,
    }));

    res.status(200).json({
      success: true,
      data: models,
    });
  } catch (error: any) {
    console.error("Error fetching models from LiteLLM proxy:", error);
    next(error);
  }
};

/**
 * Get detailed information for a specific model from LiteLLM proxy
 */
export const getModelInfo = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { modelName } = req.params;

  if (!LITELLM_MASTER_KEY) {
    return res.status(500).json({
      success: false,
      error: { message: "LiteLLM master key not configured" },
    });
  }

  if (!modelName) {
    return res.status(400).json({
      success: false,
      error: { message: "Model name is required" },
    });
  }

  try {
    const response = await fetch(`${LITELLM_PROXY_URL}/v1/model/info?model=${encodeURIComponent(modelName)}`, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${LITELLM_MASTER_KEY}`,
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LiteLLM model info API error for ${modelName}: ${response.status}`, errorText);
      return res.status(response.status).json({
        success: false,
        error: { 
          message: `Failed to fetch model info from LiteLLM proxy: ${response.statusText}`,
          details: errorText.substring(0, 200)
        },
      });
    }

    const data = await response.json();
    
    res.status(200).json({
      success: true,
      data: data,
    });
  } catch (error: any) {
    console.error(`Error fetching model info for ${modelName} from LiteLLM proxy:`, error);
    next(error);
  }
};

/**
 * Test connection to LiteLLM proxy with a simple completion
 */
export const testConnection = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { modelName = "gpt-3.5-turbo" } = req.body;

  if (!LITELLM_MASTER_KEY) {
    return res.status(500).json({
      success: false,
      error: { message: "LiteLLM master key not configured" },
    });
  }

  try {
    const response = await fetch(`${LITELLM_PROXY_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${LITELLM_MASTER_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: modelName,
        messages: [{ role: "user", content: "Hello! Respond with just 'OK' to test the connection." }],
        max_tokens: 10,
      }),
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error(`LiteLLM test connection error: ${response.status}`, errorText);
      return res.status(response.status).json({
        success: false,
        error: { 
          message: `LiteLLM connection test failed: ${response.statusText}`,
          details: errorText.substring(0, 200)
        },
      });
    }

    const data = await response.json();
    
    res.status(200).json({
      success: true,
      message: "LiteLLM connection successful",
      data: {
        responseText: data.choices?.[0]?.message?.content,
        usage: data.usage,
      },
    });
  } catch (error: any) {
    console.error("Error testing LiteLLM connection:", error);
    next(error);
  }
};

/**
 * Helper function to extract provider from model name
 */
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