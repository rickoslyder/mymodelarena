import { describe, it, expect } from "vitest";
import { calculateCost } from "./costUtils";

describe("costUtils", () => {
  describe("calculateCost", () => {
    it("should calculate cost correctly with valid inputs", () => {
      const pricing = {
        inputTokenCost: 0.001, // $0.001 per 1k tokens
        outputTokenCost: 0.002, // $0.002 per 1k tokens
      };

      const inputTokens = 1000; // 1k tokens
      const outputTokens = 500; // 0.5k tokens

      const result = calculateCost(pricing, inputTokens, outputTokens);

      // Expected: (1000/1000 * 0.001) + (500/1000 * 0.002) = 0.001 + 0.001 = 0.002
      expect(result).toBe(0.002);
    });

    it("should handle zero tokens", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 0, 0);
      expect(result).toBe(0);
    });

    it("should handle only input tokens", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 2000, 0);
      // Expected: (2000/1000 * 0.001) = 0.002
      expect(result).toBe(0.002);
    });

    it("should handle only output tokens", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 0, 1500);
      // Expected: (1500/1000 * 0.002) = 0.003
      expect(result).toBe(0.003);
    });

    it("should handle fractional tokens correctly", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 1500, 750);
      // Expected: (1500/1000 * 0.001) + (750/1000 * 0.002) = 0.0015 + 0.0015 = 0.003
      expect(result).toBe(0.003);
    });

    it("should handle very small costs", () => {
      const pricing = {
        inputTokenCost: 0.000001, // Very small cost
        outputTokenCost: 0.000002,
      };

      const result = calculateCost(pricing, 100, 50);
      // Expected: (100/1000 * 0.000001) + (50/1000 * 0.000002) = 0.0000001 + 0.0000001 = 0.0000002
      expect(result).toBeCloseTo(0.0000002, 10);
    });

    it("should handle large token counts", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 100000, 50000);
      // Expected: (100000/1000 * 0.001) + (50000/1000 * 0.002) = 0.1 + 0.1 = 0.2
      expect(result).toBe(0.2);
    });

    it("should handle high precision pricing", () => {
      const pricing = {
        inputTokenCost: 0.0012345,
        outputTokenCost: 0.0023456,
      };

      const result = calculateCost(pricing, 1000, 1000);
      // Expected: (1000/1000 * 0.0012345) + (1000/1000 * 0.0023456) = 0.0012345 + 0.0023456 = 0.0035801
      expect(result).toBeCloseTo(0.0035801, 7);
    });

    it("should handle zero pricing", () => {
      const pricing = {
        inputTokenCost: 0,
        outputTokenCost: 0,
      };

      const result = calculateCost(pricing, 1000, 1000);
      expect(result).toBe(0);
    });

    it("should handle asymmetric pricing", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.0001, // Very low output cost
      };

      const result = calculateCost(pricing, 1000, 1000);
      // Expected: (1000/1000 * 0.001) + (1000/1000 * 0.0001) = 0.0011
      expect(result).toBe(0.0011);
    });

    it("should return precise results for common use cases", () => {
      // OpenAI GPT-3.5-turbo style pricing
      const pricing = {
        inputTokenCost: 0.0015, // $1.50 per 1M tokens = $0.0015 per 1k tokens
        outputTokenCost: 0.002, // $2.00 per 1M tokens = $0.002 per 1k tokens
      };

      // Typical conversation
      const result = calculateCost(pricing, 2000, 800);
      // Expected: (2000/1000 * 0.0015) + (800/1000 * 0.002) = 0.003 + 0.0016 = 0.0046
      expect(result).toBe(0.0046);
    });

    it("should handle edge case with 1 token", () => {
      const pricing = {
        inputTokenCost: 0.001,
        outputTokenCost: 0.002,
      };

      const result = calculateCost(pricing, 1, 1);
      // Expected: (1/1000 * 0.001) + (1/1000 * 0.002) = 0.000001 + 0.000002 = 0.000003
      expect(result).toBeCloseTo(0.000003, 9);
    });

    it("should maintain precision with complex calculations", () => {
      const pricing = {
        inputTokenCost: 0.0013579,
        outputTokenCost: 0.0024681,
      };

      const result = calculateCost(pricing, 3333, 7777);
      // Manual calculation for verification
      const inputCost = (3333 / 1000) * 0.0013579;
      const outputCost = (7777 / 1000) * 0.0024681;
      const expected = inputCost + outputCost;

      expect(result).toBeCloseTo(expected, 10);
    });
  });
});