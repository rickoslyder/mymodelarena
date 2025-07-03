import { describe, it, expect, vi, beforeEach } from "vitest";
import TokenizerService from "./tokenizerService";

// Mock gpt-tokenizer
vi.mock("gpt-tokenizer", () => ({
  countTokens: vi.fn(),
}));

describe("TokenizerService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("countTokens", () => {
    it("should count tokens correctly for a simple string", () => {
      const mockCountTokens = vi.fn().mockReturnValue(5);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens("Hello world");

      expect(mockCountTokens).toHaveBeenCalledWith("Hello world");
      expect(result).toBe(5);
    });

    it("should handle empty strings", () => {
      const result = TokenizerService.countTokens("");
      expect(result).toBe(0);
    });

    it("should handle strings with special characters", () => {
      const mockCountTokens = vi.fn().mockReturnValue(3);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens("Hello! 🌟 How are you?");

      expect(mockCountTokens).toHaveBeenCalledWith("Hello! 🌟 How are you?");
      expect(result).toBe(3);
    });

    it("should handle very long strings", () => {
      const longString = "word ".repeat(1000);
      const mockCountTokens = vi.fn().mockReturnValue(2000);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens(longString);

      expect(mockCountTokens).toHaveBeenCalledWith(longString);
      expect(result).toBe(2000);
    });

    it("should handle null and undefined gracefully", () => {
      const mockEncode = vi.fn().mockReturnValue([]);
      require("gpt-tokenizer").default.encode = mockEncode;

      expect(TokenizerService.countTokens(null as any)).toBe(0);
      expect(TokenizerService.countTokens(undefined as any)).toBe(0);
    });

    it("should handle tokenizer errors gracefully", () => {
      const mockCountTokens = vi.fn().mockImplementation(() => {
        throw new Error("Tokenizer failed");
      });
      require("gpt-tokenizer").countTokens = mockCountTokens;

      // Should not throw, but return a reasonable fallback
      const result = TokenizerService.countTokens("test string");
      
      // The actual implementation returns 0 on error
      expect(result).toBe(0);
    });

    it("should handle multi-line strings", () => {
      const multilineString = `This is a 
      multi-line string
      with different lines`;
      
      const mockCountTokens = vi.fn().mockReturnValue(8);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens(multilineString);

      expect(mockCountTokens).toHaveBeenCalledWith(multilineString);
      expect(result).toBe(8);
    });

    it("should handle code snippets", () => {
      const codeString = `
        function hello() {
          console.log("Hello world");
          return true;
        }
      `;
      
      const mockCountTokens = vi.fn().mockReturnValue(15);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens(codeString);

      expect(result).toBe(15);
    });

    it("should handle JSON strings", () => {
      const jsonString = JSON.stringify({
        name: "Test",
        value: 123,
        nested: {
          array: [1, 2, 3],
          boolean: true
        }
      });
      
      const mockCountTokens = vi.fn().mockReturnValue(20);
      require("gpt-tokenizer").countTokens = mockCountTokens;

      const result = TokenizerService.countTokens(jsonString);

      expect(result).toBe(20);
    });
  });
});