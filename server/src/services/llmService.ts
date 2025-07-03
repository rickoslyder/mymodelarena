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
  responseText?: string | null;
  error?: string | null;
  inputTokens?: number;
  outputTokens?: number;
  executionTimeMs?: number;
}

/**
 * Service for interacting with Large Language Models via LiteLLM proxy.
 * Simplifies the previous complex provider-specific logic by using a unified proxy.
 */
class LlmService {
  private static get LITELLM_PROXY_URL() {
    return process.env.LITELLM_PROXY_URL || "https://openai-proxy-0l7e.onrender.com";
  }
  
  private static get LITELLM_MASTER_KEY() {
    return process.env.LITELLM_MASTER_KEY;
  }

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
        responseText: null,
        error: "Server configuration error: LiteLLM master key not found. Please check LITELLM_MASTER_KEY environment variable.",
        executionTimeMs: 0,
      };
    }
    
    if (!this.LITELLM_PROXY_URL) {
      return {
        responseText: null,
        error: "Server configuration error: LITELLM_PROXY_URL not found. Please check LITELLM_PROXY_URL environment variable.",
        executionTimeMs: 0,
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
      ...(options?.top_p !== undefined && { top_p: options.top_p }),
      ...(options?.frequency_penalty !== undefined && { frequency_penalty: options.frequency_penalty }),
      ...(options?.presence_penalty !== undefined && { presence_penalty: options.presence_penalty }),
    };

    // Add JSON mode if requested
    if (forceJsonOutput) {
      requestBody.response_format = { type: "json_object" };
      // Add JSON instruction to prompt as backup
      requestBody.messages[0].content += 
        "\n\nPlease respond with valid JSON format. Your entire response should be a valid JSON object.";
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
        let errorMessage = "Unknown error";
        try {
          const errorData = JSON.parse(errorBody);
          errorMessage = errorData.error?.message || errorBody;
        } catch {
          errorMessage = response.statusText;
        }
        
        return {
          responseText: null,
          error: `LiteLLM API error (${response.status}): ${errorMessage}`,
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
          responseText: null,
          error: "No response content received from LLM",
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
        error: null,
        inputTokens: finalInputTokens,
        outputTokens: finalOutputTokens,
        executionTimeMs,
      };
    } catch (error: any) {
      const endTime = Date.now();
      console.error(`Error during LiteLLM call for ${model.name}:`, error);
      return {
        responseText: null,
        error: `Request failed: ${error.message}`,
        executionTimeMs: endTime - startTime,
      };
    }
  }
}

export default LlmService;
