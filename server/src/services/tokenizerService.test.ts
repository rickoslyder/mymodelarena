import { describe, it, expect, vi, beforeEach } from "vitest";
import TokenizerService from "./tokenizerService";

// Mock gpt-tokenizer with factory
vi.mock("gpt-tokenizer", () => ({
  countTokens: vi.fn(),
}));

describe("TokenizerService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("countTokens", () => {
    it("should count tokens correctly for a simple string", async () => {
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(5);

      const result = TokenizerService.countTokens("Hello world");

      expect(countTokens).toHaveBeenCalledWith("Hello world");
      expect(result).toBe(5);
    });

    it("should handle empty strings", () => {
      const result = TokenizerService.countTokens("");
      expect(result).toBe(0);
    });

    it("should handle strings with special characters", async () => {
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(3);

      const result = TokenizerService.countTokens("Hello! 🌟 How are you?");

      expect(countTokens).toHaveBeenCalledWith("Hello! 🌟 How are you?");
      expect(result).toBe(3);
    });

    it("should handle very long strings", async () => {
      const longString = "word ".repeat(1000);
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(2000);

      const result = TokenizerService.countTokens(longString);

      expect(countTokens).toHaveBeenCalledWith(longString);
      expect(result).toBe(2000);
    });

    it("should handle null and undefined gracefully", () => {
      expect(TokenizerService.countTokens(null as any)).toBe(0);
      expect(TokenizerService.countTokens(undefined as any)).toBe(0);
    });

    it("should handle tokenizer errors gracefully", async () => {
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockImplementation(() => {
        throw new Error("Tokenizer failed");
      });

      // Should not throw, but return a reasonable fallback
      const result = TokenizerService.countTokens("test string");
      
      // The actual implementation returns 0 on error
      expect(result).toBe(0);
    });

    it("should handle multi-line strings", async () => {
      const multilineString = `This is a 
      multi-line string
      with different lines`;
      
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(8);

      const result = TokenizerService.countTokens(multilineString);

      expect(countTokens).toHaveBeenCalledWith(multilineString);
      expect(result).toBe(8);
    });

    it("should handle code snippets", async () => {
      const codeString = `
        function hello() {
          console.log("Hello world");
          return true;
        }
      `;
      
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(15);

      const result = TokenizerService.countTokens(codeString);

      expect(result).toBe(15);
    });

    it("should handle JSON strings", async () => {
      const jsonString = JSON.stringify({
        name: "Test",
        value: 123,
        nested: {
          array: [1, 2, 3],
          boolean: true
        }
      });
      
      const { countTokens } = await import("gpt-tokenizer");
      vi.mocked(countTokens).mockReturnValue(20);

      const result = TokenizerService.countTokens(jsonString);

      expect(result).toBe(20);
    });
  });
});