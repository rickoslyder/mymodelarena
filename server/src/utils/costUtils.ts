import { Model } from "@prisma/client";

/**
 * Calculates the estimated cost of an LLM API call based on token counts and model pricing.
 *
 * @param model The model object containing pricing information (cost per 1k tokens).
 * @param inputTokens The number of input tokens used.
 * @param outputTokens The number of output tokens generated.
 * @returns The estimated cost, or 0 if inputs are invalid.
 */
export const calculateCost = (
  model: Pick<Model, "inputTokenCost" | "outputTokenCost">,
  inputTokens: number | null | undefined,
  outputTokens: number | null | undefined
): number => {
  // Ensure we have valid numbers for calculation
  const validModel =
    model && model.inputTokenCost > 0 && model.outputTokenCost > 0;
  const validInputs = typeof inputTokens === "number" && inputTokens >= 0;
  const validOutputs = typeof outputTokens === "number" && outputTokens >= 0;

  if (!validModel || (!validInputs && !validOutputs)) {
    return 0; // Cannot calculate cost if pricing or token counts are missing/invalid
  }

  const inputCost = ((inputTokens || 0) / 1000) * model.inputTokenCost;
  const outputCost = ((outputTokens || 0) / 1000) * model.outputTokenCost;

  return inputCost + outputCost;
};
