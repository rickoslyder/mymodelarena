import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fetch from "node-fetch";
import LlmService from "./llmService";
import { Model } from "@prisma/client";

// Mock node-fetch
vi.mock("node-fetch");

describe("LlmService", () => {
  const mockModel: Model = {
    id: "test-model-1",
    name: "Test Model",
    modelIdentifier: "gpt-3.5-turbo",
    baseUrl: "https://api.openai.com/v1",
    apiKeyEnvVar: "TEST_API_KEY",
    inputTokenCost: 0.001,
    outputTokenCost: 0.002,
    createdAt: new Date(),
    updatedAt: new Date(),
    provider: "openai"
  };

  const originalEnv = process.env;

  beforeEach(() => {
    vi.resetAllMocks();
    process.env = { ...originalEnv };
    process.env.LITELLM_PROXY_URL = "https://test-proxy.com";
    process.env.LITELLM_MASTER_KEY = "test-master-key";
    process.env.TEST_API_KEY = "test-api-key";
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe("getLLMCompletion", () => {
    it("should successfully get completion from LiteLLM proxy", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: "This is a test response"
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      expect(result).toEqual({
        responseText: "This is a test response",
        error: null,
        inputTokens: expect.any(Number),
        outputTokens: expect.any(Number),
        executionTimeMs: expect.any(Number)
      });

      expect(fetch).toHaveBeenCalledWith(
        "https://test-proxy.com/v1/chat/completions",
        expect.objectContaining({
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            "Authorization": "Bearer test-master-key"
          },
          body: expect.stringContaining("gpt-3.5-turbo")
        })
      );
    });

    it("should handle JSON output forcing", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: '{"key": "value"}'
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 15,
            total_tokens: 25
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt",
        { temperature: 0.5 },
        true // forceJsonOutput
      );

      expect(result.responseText).toBe('{"key": "value"}');
      
      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall![1]!.body as string);
      
      expect(requestBody.response_format).toEqual({ type: "json_object" });
      expect(requestBody.messages[0].content).toContain("respond with valid JSON");
    });

    it("should handle API errors gracefully", async () => {
      const mockErrorResponse = {
        ok: false,
        status: 400,
        statusText: "Bad Request",
        json: () => Promise.resolve({
          error: {
            message: "Invalid request"
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockErrorResponse as any);

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      expect(result).toEqual({
        responseText: null,
        error: "LiteLLM API error (400): Bad Request",
        executionTimeMs: expect.any(Number)
      });
    });

    it("should handle network errors", async () => {
      vi.mocked(fetch).mockRejectedValue(new Error("Network error"));

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      expect(result).toEqual({
        responseText: null,
        error: "Request failed: Network error",
        executionTimeMs: expect.any(Number)
      });
    });

    it("should handle missing response content", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{}], // Missing message/content
          usage: {
            prompt_tokens: 10,
            completion_tokens: 0,
            total_tokens: 10
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      expect(result).toEqual({
        responseText: null,
        error: "No response content received from LLM",
        inputTokens: 10,
        outputTokens: 0,
        executionTimeMs: expect.any(Number)
      });
    });

    it("should use custom options when provided", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: "Response with custom options"
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 20,
            total_tokens: 30
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt",
        {
          temperature: 0.8,
          max_tokens: 100,
          top_p: 0.9
        }
      );

      const fetchCall = vi.mocked(fetch).mock.calls[0];
      const requestBody = JSON.parse(fetchCall![1]!.body as string);
      
      expect(requestBody.temperature).toBe(0.8);
      expect(requestBody.max_tokens).toBe(100);
      expect(requestBody.top_p).toBe(0.9);
    });

    it("should handle missing environment variables", async () => {
      delete process.env.LITELLM_MASTER_KEY;

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      expect(result.error).toContain("LITELLM_MASTER_KEY");
    });

    it("should measure execution time accurately", async () => {
      const mockResponse = {
        ok: true,
        status: 200,
        json: () => Promise.resolve({
          choices: [{
            message: {
              content: "Delayed response"
            }
          }],
          usage: {
            prompt_tokens: 10,
            completion_tokens: 10,
            total_tokens: 20
          }
        })
      };

      vi.mocked(fetch).mockResolvedValue(mockResponse as any);

      const result = await LlmService.getLLMCompletion(
        mockModel,
        "Test prompt"
      );

      // Just verify that execution time is measured (should be >= 0)
      expect(result.executionTimeMs).toBeGreaterThanOrEqual(0);
      expect(result.executionTimeMs).toBeLessThan(1000); // Should be very fast in tests
    });
  });
});