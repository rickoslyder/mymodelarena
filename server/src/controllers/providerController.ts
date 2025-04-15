import { Request, Response, NextFunction } from "express";
import fetch from "node-fetch";

// Define known provider base URLs and API key env var names
// Add more providers as needed
const PROVIDER_CONFIG: Record<
  string,
  { listModelsUrl: string; apiKeyEnvVar: string | null; docs: string }
> = {
  openai: {
    listModelsUrl: "https://api.openai.com/v1/models",
    apiKeyEnvVar: process.env.OPENAI_API_KEY_ENV_VAR || "OPENAI_API_KEY", // Read env var name from root .env
    docs: "https://platform.openai.com/docs/api-reference/models/list",
  },
  anthropic: {
    listModelsUrl: "https://api.anthropic.com/v1/models", // Note: This specific endpoint might not exist, check docs
    apiKeyEnvVar: process.env.ANTHROPIC_API_KEY_ENV_VAR || "ANTHROPIC_API_KEY",
    docs: "https://docs.anthropic.com/en/api/models-list", // Actual Anthropic list seems integrated?
  },
  google: {
    listModelsUrl: `https://generativelanguage.googleapis.com/v1beta/models`, // Needs key in query param
    apiKeyEnvVar: process.env.GEMINI_API_KEY_ENV_VAR || "GEMINI_API_KEY", // Renamed for clarity
    docs: "https://ai.google.dev/api/models#models.list",
  },
  mistral: {
    listModelsUrl: "https://api.mistral.ai/v1/models",
    apiKeyEnvVar: process.env.MISTRAL_API_KEY_ENV_VAR || "MISTRAL_API_KEY",
    docs: "https://docs.mistral.ai/api/#tag/models/operation/listModels",
  },
  openrouter: {
    listModelsUrl: "https://openrouter.ai/api/v1/models",
    apiKeyEnvVar:
      process.env.OPENROUTER_API_KEY_ENV_VAR || "OPENROUTER_API_KEY", // Assuming standard naming
    docs: "https://openrouter.ai/docs/models",
  },
  groq: {
    listModelsUrl: "https://api.groq.com/openai/v1/models", // Uses openai path
    apiKeyEnvVar: process.env.GROQ_API_KEY_ENV_VAR || "GROQ_API_KEY",
    docs: "https://console.groq.com/docs/api-reference#models-list",
  },
  grok: {
    listModelsUrl: "https://api.x.ai/v1/models", // Standard OpenAI path assumption
    apiKeyEnvVar: process.env.XAI_API_KEY_ENV_VAR || "XAI_API_KEY",
    docs: "https://docs.x.ai/docs/api-reference", // General API ref
  },
  // Add deepseek, etc. if their list models API is known
};

// Standardized response format
interface ProviderModel {
  id: string;
  name: string; // Usually a display name or the ID itself
}

export const listProviderModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const provider = req.params.provider as string;
  const config = PROVIDER_CONFIG[provider];

  if (!config) {
    return res.status(404).json({
      success: false,
      error: {
        message: `Provider '${provider}' not found or not supported.`,
      },
    });
  }

  const apiKey = config.apiKeyEnvVar ? process.env[config.apiKeyEnvVar] : null;

  if (config.apiKeyEnvVar && !apiKey) {
    return res.status(400).json({
      success: false,
      error: {
        message: `API Key Environment Variable '${config.apiKeyEnvVar}' for provider '${provider}' is not set on the server.`,
      },
    });
  }

  try {
    let url = config.listModelsUrl;
    const headers: Record<string, string> = {
      Accept: "application/json",
    };

    // Provider-specific adjustments
    if (apiKey) {
      if (provider === "google") {
        url += `?key=${apiKey}`;
      } else if (provider === "anthropic") {
        headers["x-api-key"] = apiKey;
        headers["anthropic-version"] = "2023-06-01"; // Example version, check docs
      } else {
        headers["Authorization"] = `Bearer ${apiKey}`;
      }
    }

    console.log(`Fetching models for provider: ${provider} from ${url}`);
    const response = await fetch(url, { headers });

    if (!response.ok) {
      let errorBody = "Unknown error";
      try {
        errorBody = await response.text();
      } catch (_) {}
      console.error(
        `API Error for ${provider}: ${response.status} ${response.statusText}`,
        errorBody
      );
      throw new Error(
        `Failed to fetch models from ${provider}: ${response.status} ${response.statusText}`
      );
    }

    const data: any = await response.json();
    let models: ProviderModel[] = [];

    // --- Data Normalization ---
    // This part needs careful implementation based on each API's response structure
    if (provider === "openai" && data.data) {
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.id }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    } else if (provider === "anthropic" && data.data) {
      // NOTE: Anthropic /models endpoint might not work like this.
      // Their models are often listed statically or via different means.
      // Assuming a hypothetical structure similar to OpenAI for now.
      console.warn(
        "Anthropic /models endpoint may not be correct, using placeholder logic."
      );
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.display_name || m.id }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (provider === "google" && data.models) {
      models = data.models
        .map((m: any) => ({ id: m.name, name: m.displayName || m.name }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (provider === "mistral" && data.data) {
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.id }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    } else if (provider === "openrouter" && data.data) {
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.name || m.id }))
        .sort((a: any, b: any) => a.name.localeCompare(b.name));
    } else if (provider === "groq" && data.data) {
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.id })) // Groq response uses id
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    } else if (provider === "grok" && data.data) {
      // Assuming Grok follows OpenAI structure based on their docs
      models = data.data
        .map((m: any) => ({ id: m.id, name: m.id }))
        .sort((a: any, b: any) => a.id.localeCompare(b.id));
    } else {
      console.warn(
        `Unexpected response structure for provider: ${provider}`,
        data
      );
      // Attempt a generic extraction if possible, otherwise return empty
      if (Array.isArray(data)) {
        // Simple list of strings?
        models = data.map((m: any) => ({ id: String(m), name: String(m) }));
      } else {
        throw new Error(`Could not parse model list from ${provider}.`);
      }
    }

    res.status(200).json({ success: true, data: models });
  } catch (error) {
    console.error(`Error fetching models for ${provider}:`, error);
    next(error);
  }
};
