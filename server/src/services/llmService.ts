import fetch from "node-fetch";
import { Model } from "@prisma/client";
import tokenizerService from "./tokenizerService";

// Define a basic structure for LLM API options (can be expanded)
interface LlmApiOptions {
  temperature?: number;
  max_tokens?: number;
  top_p?: number;
  frequency_penalty?: number;
  presence_penalty?: number;
  // Add other common OpenAI parameters as needed
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
 * Service for interacting with Large Language Models via LiteLLM proxy.
 * Simplifies the previous complex provider-specific logic by using a unified proxy.
 */
class LlmService {
  private static readonly LITELLM_PROXY_URL = process.env.LITELLM_PROXY_URL || "https://openai-proxy-0l7e.onrender.com";
  private static readonly LITELLM_MASTER_KEY = process.env.LITELLM_MASTER_KEY;

  /**
   * Gets a completion from an LLM via LiteLLM proxy.
   *
   * @param model The configured model object from the database.
   * @param prompt The user prompt string.
   * @param options Optional parameters for the LLM API call.
   * @param forceJsonOutput If true, attempt to force JSON output.
   * @returns A promise resolving to the completion result.
   */
  public static async getLLMCompletion(
    model: Model,
    prompt: string,
    options?: LlmApiOptions,
    forceJsonOutput: boolean = false
  ): Promise<LlmCompletionResult> {
    if (!this.LITELLM_MASTER_KEY) {
      console.error("LITELLM_MASTER_KEY not found in environment variables");
      return {
        error: "Server configuration error: LiteLLM master key not found.",
      };
    }

    const startTime = Date.now();
    const url = `${this.LITELLM_PROXY_URL}/v1/chat/completions`;
    
    // Prepare the request body using OpenAI-compatible format
    // LiteLLM will handle the provider-specific translation
    const requestBody: any = {
      model: model.modelIdentifier || model.name,
      messages: [{ role: "user", content: prompt }],
      ...(options?.temperature !== undefined && { temperature: options.temperature }),
      ...(options?.max_tokens !== undefined && { max_tokens: options.max_tokens }),
    };

    // Add JSON mode if requested
    if (forceJsonOutput) {
      requestBody.response_format = { type: "json_object" };
      // Add JSON instruction to prompt as backup
      requestBody.messages[0].content += 
        "\n\nPlease format your entire response as a single, valid JSON object. Do not include any text outside of the JSON structure.";
    }

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${this.LITELLM_MASTER_KEY}`,
    };

    try {
      console.log(`Calling LLM via LiteLLM proxy: ${model.name} (model: ${requestBody.model})`);
      
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
          `LiteLLM API Error for ${model.name}: ${response.status} ${response.statusText}`,
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
      
      // Parse response using OpenAI format (LiteLLM standardizes this)
      const responseText = data.choices?.[0]?.message?.content;
      const inputTokens = data.usage?.prompt_tokens;
      const outputTokens = data.usage?.completion_tokens;

      if (responseText === undefined) {
        console.error("Could not parse response text from LiteLLM:", model.name, data);
        return {
          error: "Failed to parse response text from LLM.",
          executionTimeMs,
          inputTokens,
          outputTokens,
        };
      }

      // Use LiteLLM's token counts if available, otherwise fallback to our tokenizer
      const finalInputTokens = inputTokens || tokenizerService.countTokens(prompt);
      const finalOutputTokens = outputTokens || tokenizerService.countTokens(responseText);

      if (inputTokens === undefined) {
        console.warn(`Input tokens not provided by LiteLLM for ${model.name}, estimated: ${finalInputTokens}`);
      }
      if (outputTokens === undefined) {
        console.warn(`Output tokens not provided by LiteLLM for ${model.name}, estimated: ${finalOutputTokens}`);
      }

      return {
        responseText,
        inputTokens: finalInputTokens,
        outputTokens: finalOutputTokens,
        executionTimeMs,
      };
    } catch (error: any) {
      const endTime = Date.now();
      console.error(`Error during LiteLLM call for ${model.name}:`, error);
      return {
        error: `Network or other error during API call: ${error.message}`,
        executionTimeMs: endTime - startTime,
      };
    }
  }
}

export default LlmService;
