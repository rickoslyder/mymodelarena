import fetch from "node-fetch"; // Use node-fetch for backend HTTP requests
import { Model } from "@prisma/client";
import tokenizerService from "./tokenizerService"; // Assume tokenizerService exports an object or class instance with a countTokens method

// Define a basic structure for LLM API options (can be expanded)
interface LlmApiOptions {
  temperature?: number;
  max_tokens?: number;
  // Add other common OpenAI parameters as needed (top_p, frequency_penalty, etc.)
}

// Define a structure for the completion result
interface LlmCompletionResult {
  responseText?: string;
  error?: string;
  inputTokens?: number;
  outputTokens?: number;
  executionTimeMs?: number;
}

/**
 * Service for interacting with Large Language Models following OpenAI API protocol.
 */
class LlmService {
  /**
   * Gets a completion from an LLM.
   *
   * @param model The configured model object from the database.
   * @param prompt The user prompt string.
   * @param options Optional parameters for the LLM API call.
   * @param forceJsonOutput If true, attempt to force JSON output using provider features.
   * @returns A promise resolving to the completion result.
   */
  public static async getLLMCompletion(
    model: Model,
    prompt: string,
    options?: LlmApiOptions,
    forceJsonOutput: boolean = false
  ): Promise<LlmCompletionResult> {
    const apiKey = process.env[model.apiKeyEnvVar];

    if (!apiKey) {
      console.error(
        `API Key Env Var '${model.apiKeyEnvVar}' not found for model ${model.name}`
      );
      return {
        error: `Server configuration error: API key for ${model.name} not found.`,
      };
    }

    let url = model.baseUrl;
    let requestBody: any;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // --- Determine effective prompt (inject JSON instructions if needed) ---
    let effectivePrompt = prompt;
    const jsonInstruction =
      "\nPlease format your entire response as a single, valid JSON object. Do not include any text outside of the JSON structure.";

    const startTime = Date.now();

    try {
      // --- Provider Specific Formatting ---
      if (model.provider === "google") {
        // Construct Google API URL
        // Check if modelIdentifier already contains the 'models/' prefix
        const modelPath = model.modelIdentifier?.startsWith("models/")
          ? model.modelIdentifier
          : `models/${model.modelIdentifier}`;
        url = `${model.baseUrl}/${modelPath}:generateContent?key=${apiKey}`;

        // Inject JSON instruction for Google if requested (schema handling is complex, deferring)
        if (forceJsonOutput) {
          effectivePrompt += jsonInstruction;
          console.log(
            `Requesting JSON output from Google (via prompt injection) for ${model.name}`
          );
          // Note: Ideally we'd use responseSchema here, but it requires knowing the structure.
          // For now, we just try prompting.
        }

        // Construct Google API Request Body
        requestBody = {
          contents: [
            {
              parts: [
                { text: effectivePrompt }, // Use effective prompt
              ],
            },
          ],
          generationConfig: {
            // Map options if provided
            ...(options?.temperature !== undefined && {
              temperature: options.temperature,
            }),
            ...(options?.max_tokens !== undefined && {
              maxOutputTokens: options.max_tokens,
            }),
            // Add mime type if forcing JSON (best effort without schema)
            ...(forceJsonOutput && { responseMimeType: "application/json" }),
          },
        };
        // Google doesn't use Bearer token header
        delete headers["Authorization"];
      } else {
        // Default to OpenAI compatible structure
        headers["Authorization"] = `Bearer ${apiKey}`;
        if (model.provider === "anthropic") {
          headers["x-api-key"] = apiKey;
          headers["anthropic-version"] = "2023-06-01"; // Or get from config?
          // Remove bearer token if anthropic
          delete headers["Authorization"];
          // Inject JSON instruction for Anthropic if requested (no native mode known)
          if (forceJsonOutput) {
            effectivePrompt += jsonInstruction;
            console.log(
              `Requesting JSON output from Anthropic (via prompt injection) for ${model.name}`
            );
          }
        }

        // --- Construct OpenAI compatible Request Body ---
        requestBody = {
          // Use modelIdentifier if available and not custom, otherwise might not be needed
          ...(model.modelIdentifier &&
            model.provider !== "custom" && { model: model.modelIdentifier }),
          messages: [{ role: "user", content: effectivePrompt }], // Use effective prompt
          ...(options?.temperature !== undefined && {
            temperature: options.temperature,
          }),
          ...(options?.max_tokens !== undefined && {
            max_tokens: options.max_tokens,
          }),
        };

        // Add JSON mode flag for supported providers (excluding Anthropic, Google)
        if (
          forceJsonOutput &&
          model.provider !== "anthropic" &&
          model.provider !== "google"
        ) {
          console.log(
            `Requesting JSON mode for ${model.provider || "custom"} model ${
              model.name
            }`
          );
          requestBody.response_format = { type: "json_object" };
          // Also inject prompt instruction as backup / best practice
          // Find system prompt or add/append to user prompt
          let promptInjected = false;
          if (requestBody.messages) {
            const systemMessageIndex = requestBody.messages.findIndex(
              (m: any) => m.role === "system"
            );
            if (systemMessageIndex !== -1) {
              requestBody.messages[systemMessageIndex].content +=
                jsonInstruction;
              promptInjected = true;
            } else {
              // Prepend to user message if no system message
              requestBody.messages[0].content =
                jsonInstruction + "\n\n" + requestBody.messages[0].content;
              promptInjected = true;
            }
          }
          if (!promptInjected) {
            // Fallback if messages structure is unexpected (shouldn't happen with current logic)
            effectivePrompt += jsonInstruction;
            requestBody.messages = [{ role: "user", content: effectivePrompt }];
          }
        }
      }
      // --- End Provider Specific Formatting ---

      // Append /chat/completions for OpenAI-compatible APIs
      // Check if the provider is NOT google and baseUrl doesn't already end with it
      if (model.provider !== "google" && !url.endsWith("/chat/completions")) {
        url = url.replace(/\/?$/, "/chat/completions"); // Add path, ensuring single slash
      }

      console.log(
        `Calling LLM: ${model.name} at ${url} (Provider: ${
          model.provider || "custom"
        })`
      );
      const response = await fetch(url, {
        method: "POST",
        headers: headers,
        body: JSON.stringify(requestBody),
      });
      const endTime = Date.now();
      const executionTimeMs = endTime - startTime;

      if (!response.ok) {
        let errorBody = "Unknown error";
        try {
          errorBody = await response.text();
        } catch (_) {}
        console.error(
          `LLM API Error for ${model.name}: ${response.status} ${response.statusText}`,
          errorBody
        );
        return {
          error: `API request failed with status ${response.status}: ${
            response.statusText
          }. Details: ${errorBody.substring(0, 200)}`,
          executionTimeMs,
        };
      }

      const data: any = await response.json();
      let responseText: string | undefined;
      let outputTokens: number | undefined;
      let inputTokens: number | undefined;

      // --- Provider Specific Response Parsing ---
      if (model.provider === "google") {
        // Google response structure
        responseText = data.candidates?.[0]?.content?.parts?.[0]?.text;
        // Google token count might be in usageMetadata
        inputTokens = data.usageMetadata?.promptTokenCount;
        outputTokens = data.usageMetadata?.candidatesTokenCount;
        // Ensure safety ratings are handled if needed (check data.candidates[0].finishReason === 'SAFETY')
        if (
          data.candidates?.[0]?.finishReason &&
          data.candidates[0].finishReason !== "STOP"
        ) {
          console.warn(
            `Google finishReason: ${data.candidates[0].finishReason} for model ${model.name}`
          );
          if (data.candidates[0].finishReason === "SAFETY") {
            return {
              error: "Response blocked due to safety settings.",
              executionTimeMs,
              inputTokens,
              outputTokens: 0,
            };
          }
        }
      } else {
        // Default to OpenAI compatible structure
        responseText = data.choices?.[0]?.message?.content;
        // Attempt to parse usage if responseText is valid JSON from JSON mode
        if (forceJsonOutput && responseText && data.usage) {
          inputTokens = data.usage?.prompt_tokens;
          outputTokens = data.usage?.completion_tokens;
        } else if (!forceJsonOutput) {
          // Default OpenAI token parsing if not JSON mode
          inputTokens = data.usage?.prompt_tokens;
          outputTokens = data.usage?.completion_tokens;
        }
      }
      // --- End Provider Specific Response Parsing ---

      if (responseText === undefined) {
        console.error(
          "Could not parse response text from LLM:",
          model.name,
          data
        );
        return {
          error: "Failed to parse response text from LLM.",
          executionTimeMs,
          inputTokens,
          outputTokens,
        };
      }

      // Calculate input tokens if not provided by API (less accurate)
      if (inputTokens === undefined) {
        inputTokens = tokenizerService.countTokens(effectivePrompt); // Use effectivePrompt for estimation
        console.warn(
          `Input tokens not provided by API for ${model.name}, estimated: ${inputTokens}`
        );
      }
      // Calculate output tokens if not provided by API (less accurate)
      if (outputTokens === undefined) {
        outputTokens = tokenizerService.countTokens(responseText);
        console.warn(
          `Output tokens not provided by API for ${model.name}, estimated: ${outputTokens}`
        );
      }

      return {
        responseText,
        inputTokens,
        outputTokens,
        executionTimeMs,
      };
    } catch (error: any) {
      const endTime = Date.now();
      console.error(`Error during LLM call for ${model.name}:`, error);
      return {
        error: `Network or other error during API call: ${error.message}`,
        executionTimeMs: endTime - startTime,
      };
    }
  }
}

export default LlmService;
