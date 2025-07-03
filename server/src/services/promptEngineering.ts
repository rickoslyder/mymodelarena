import { EvalTemplate } from "@prisma/client";

export interface PromptOptions {
  questionTypes?: string[];
  difficulty?: string;
  format?: string;
  numQuestions: number;
  domain?: string;
  includeExamples?: boolean;
}

/**
 * Advanced prompt engineering service for generating high-quality evaluation questions
 */
export class PromptEngineering {

  /**
   * Build a comprehensive system prompt with examples and constraints
   */
  static buildSystemPrompt(numQuestions: number, options?: PromptOptions): string {
    const basePrompt = `You are an expert evaluation designer specializing in creating challenging, diverse, and well-crafted questions for assessing Large Language Models. Your questions should be:

1. CLEAR and UNAMBIGUOUS - No room for multiple interpretations
2. APPROPRIATELY CHALLENGING - Match the specified difficulty level
3. DIVERSE - Cover different aspects of the topic/domain
4. PRACTICAL - Test real-world applicable knowledge/skills
5. WELL-FORMATTED - Follow the specified format consistently

CRITICAL OUTPUT REQUIREMENT:
You MUST output ONLY a single, valid JSON object with this exact structure:
{"questions": ["question 1", "question 2", ...]}

Generate exactly ${numQuestions} distinct questions. Do not include numbering in the question strings themselves.`;

    let enhancedPrompt = basePrompt;

    // Add difficulty-specific guidance
    if (options?.difficulty) {
      const difficultyGuide = this.getDifficultyGuidance(options.difficulty);
      enhancedPrompt += `\n\nDIFFICULTY LEVEL: ${options.difficulty.toUpperCase()}\n${difficultyGuide}`;
    }

    // Add format-specific guidance
    if (options?.format) {
      const formatGuide = this.getFormatGuidance(options.format);
      enhancedPrompt += `\n\nQUESTION FORMAT: ${options.format}\n${formatGuide}`;
    }

    // Add question type guidance
    if (options?.questionTypes && options.questionTypes.length > 0) {
      const typeGuide = this.getQuestionTypeGuidance(options.questionTypes);
      enhancedPrompt += `\n\nQUESTION TYPES: ${options.questionTypes.join(', ')}\n${typeGuide}`;
    }

    return enhancedPrompt;
  }

  /**
   * Enhance a user prompt with structured guidance
   */
  static enhanceUserPrompt(
    basePrompt: string,
    options?: PromptOptions,
    template?: EvalTemplate
  ): string {
    let enhancedPrompt = basePrompt;

    // Add context from template if available
    if (template) {
      const templateExamples = this.parseJsonField(template.examples);
      if (templateExamples.length > 0) {
        enhancedPrompt += `\n\nExample questions in this style:\n${templateExamples.slice(0, 3).map(ex => `- ${ex}`).join('\n')}`;
      }
    }

    // Add domain-specific guidance
    if (options?.domain) {
      enhancedPrompt += `\n\nDomain focus: ${options.domain}`;
    }

    // Add question distribution guidance for multiple types
    if (options?.questionTypes && options.questionTypes.length > 1) {
      enhancedPrompt += `\n\nDistribute questions across these types: ${options.questionTypes.join(', ')}`;
    }

    return enhancedPrompt;
  }

  /**
   * Get difficulty-specific guidance
   */
  private static getDifficultyGuidance(difficulty: string): string {
    switch (difficulty.toLowerCase()) {
      case 'easy':
        return `- Focus on fundamental concepts and basic understanding
- Use straightforward language and common scenarios
- Test recall and simple application of knowledge
- Avoid complex multi-step reasoning`;

      case 'medium':
        return `- Test understanding and application of concepts
- Include some analysis and synthesis tasks
- Use realistic scenarios requiring moderate reasoning
- Balance recall with problem-solving`;

      case 'hard':
        return `- Require deep understanding and complex reasoning
- Include multi-step problems and edge cases
- Test ability to apply knowledge in novel situations
- Challenge assumptions and require justification`;

      case 'expert':
        return `- Demand mastery-level understanding
- Include highly complex, nuanced scenarios
- Test ability to handle ambiguity and uncertainty
- Require synthesis across multiple domains`;

      default:
        return `- Adjust complexity appropriately for the target audience`;
    }
  }

  /**
   * Get format-specific guidance
   */
  private static getFormatGuidance(format: string): string {
    switch (format.toLowerCase()) {
      case 'multiple-choice':
        return `- Provide 4 plausible options (A, B, C, D)
- Make distractors believable but clearly incorrect
- Ensure only one definitively correct answer
- Avoid "all of the above" or "none of the above" unless appropriate`;

      case 'true-false':
        return `- Create statements that are definitively true or false
- Avoid ambiguous wording that could be interpreted either way
- Include clear reasoning for the correct answer`;

      case 'open-ended':
        return `- Ask questions that require explanation or analysis
- Allow for multiple valid approaches or perspectives
- Encourage detailed, thoughtful responses
- Avoid questions with single-word answers`;

      case 'code-completion':
        return `- Provide partial code with clear completion requirements
- Include context about expected input/output
- Test practical programming concepts
- Ensure solutions are implementable and testable`;

      default:
        return `- Follow standard conventions for the specified format`;
    }
  }

  /**
   * Get question type-specific guidance
   */
  private static getQuestionTypeGuidance(questionTypes: string[]): string {
    const guidelines: string[] = [];

    if (questionTypes.includes('coding')) {
      guidelines.push('- Include programming problems with clear requirements');
    }
    if (questionTypes.includes('logic')) {
      guidelines.push('- Test logical reasoning and pattern recognition');
    }
    if (questionTypes.includes('knowledge')) {
      guidelines.push('- Test factual knowledge and conceptual understanding');
    }
    if (questionTypes.includes('analysis')) {
      guidelines.push('- Require breaking down complex information or arguments');
    }
    if (questionTypes.includes('creative')) {
      guidelines.push('- Encourage imaginative and original thinking');
    }
    if (questionTypes.includes('ethics')) {
      guidelines.push('- Present moral dilemmas requiring reasoned judgment');
    }
    if (questionTypes.includes('math')) {
      guidelines.push('- Include mathematical problems requiring calculation or proof');
    }

    return guidelines.join('\n');
  }

  /**
   * Validate and enhance generated questions
   */
  static validateQuestions(questions: string[], options?: PromptOptions): {
    valid: string[];
    issues: string[];
  } {
    const valid: string[] = [];
    const issues: string[] = [];

    questions.forEach((question, index) => {
      const trimmed = question.trim();
      
      // Basic validation
      if (trimmed.length < 10) {
        issues.push(`Question ${index + 1} is too short (${trimmed.length} chars)`);
        return;
      }

      if (trimmed.length > 500) {
        issues.push(`Question ${index + 1} is too long (${trimmed.length} chars)`);
        return;
      }

      // Check for numbering (should not be present)
      if (/^\d+[\.\)]\s*/.test(trimmed)) {
        issues.push(`Question ${index + 1} contains numbering`);
        return;
      }

      // Check for question mark (should end with one for interrogative)
      if (!trimmed.includes('?') && !trimmed.toLowerCase().includes('explain') && 
          !trimmed.toLowerCase().includes('describe') && !trimmed.toLowerCase().includes('write')) {
        issues.push(`Question ${index + 1} may not be properly formatted as a question`);
      }

      valid.push(trimmed);
    });

    return { valid, issues };
  }

  /**
   * Generate quality improvement suggestions
   */
  static getQualityImprovements(questions: string[]): string[] {
    const suggestions: string[] = [];
    
    // Check for diversity
    const questionWords = questions.map(q => q.toLowerCase().split(' ')[0]);
    const uniqueStarters = new Set(questionWords).size;
    
    if (uniqueStarters < questions.length * 0.7) {
      suggestions.push('Consider varying question starters for better diversity');
    }

    // Check average length
    const avgLength = questions.reduce((sum, q) => sum + q.length, 0) / questions.length;
    if (avgLength < 50) {
      suggestions.push('Questions could be more detailed and specific');
    }

    return suggestions;
  }

  /**
   * Helper to parse JSON fields safely
   */
  private static parseJsonField(field: string): string[] {
    try {
      const parsed = JSON.parse(field);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
}