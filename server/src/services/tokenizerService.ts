import { countTokens } from "gpt-tokenizer";

/**
 * Service for tokenizing text using gpt-tokenizer.
 */
class TokenizerService {
  /**
   * Counts the number of tokens in a given text string.
   *
   * @param text The text to tokenize.
   * @returns The number of tokens.
   */
  public static countTokens(text: string): number {
    if (!text) {
      return 0;
    }
    try {
      // gpt-tokenizer primarily uses cl100k_base encoding used by gpt-4, gpt-3.5-turbo, text-embedding-ada-002
      // This should be a reasonable default for most compatible models.
      return countTokens(text);
    } catch (error) {
      console.error("Error counting tokens:", error);
      // Return a fallback or handle error appropriately
      // For now, return 0, but this might hide issues.
      return 0;
    }
  }

  /**
   * Checks if the token count of a text is within a specified limit.
   *
   * @param text The text to check.
   * @param limit The maximum allowed number of tokens.
   * @returns True if the token count is within the limit, false otherwise.
   */
  public static isWithinTokenLimit(text: string, limit: number): boolean {
    return TokenizerService.countTokens(text) <= limit;
  }
}

export default TokenizerService;
