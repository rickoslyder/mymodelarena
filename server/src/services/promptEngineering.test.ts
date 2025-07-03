import { describe, it, expect } from "vitest";
import { PromptEngineering, PromptOptions } from "./promptEngineering";
import { EvalTemplate } from "@prisma/client";

describe("PromptEngineering", () => {
  describe("buildSystemPrompt", () => {
    it("should build basic system prompt with question count", () => {
      const result = PromptEngineering.buildSystemPrompt(5);

      expect(result).toContain("Generate exactly 5 distinct questions");
      expect(result).toContain("JSON object");
      expect(result).toContain('{"questions": ["question 1", "question 2", ...]}');
      expect(result).toContain("CLEAR and UNAMBIGUOUS");
      expect(result).toContain("APPROPRIATELY CHALLENGING");
    });

    it("should include difficulty guidance when specified", () => {
      const options: PromptOptions = {
        difficulty: "expert",
        numQuestions: 3
      };

      const result = PromptEngineering.buildSystemPrompt(3, options);

      expect(result).toContain("DIFFICULTY LEVEL: EXPERT");
      expect(result).toContain("Demand mastery-level understanding");
    });

    it("should include format guidance when specified", () => {
      const options: PromptOptions = {
        format: "multiple-choice",
        numQuestions: 4
      };

      const result = PromptEngineering.buildSystemPrompt(4, options);

      expect(result).toContain("QUESTION FORMAT: multiple-choice");
      expect(result).toContain("Provide 4 plausible options");
    });

    it("should include question type guidance when specified", () => {
      const options: PromptOptions = {
        questionTypes: ["analysis", "coding"],
        numQuestions: 2
      };

      const result = PromptEngineering.buildSystemPrompt(2, options);

      expect(result).toContain("QUESTION TYPES: analysis, coding");
      expect(result).toContain("breaking down complex information");
      expect(result).toContain("programming problems");
    });
  });

  describe("enhanceUserPrompt", () => {
    it("should enhance user prompt with domain guidance", () => {
      const userPrompt = "Create math questions";
      const options: PromptOptions = {
        domain: "mathematics",
        numQuestions: 3
      };

      const result = PromptEngineering.enhanceUserPrompt(userPrompt, options);

      expect(result).toContain("Create math questions");
      expect(result).toContain("Domain focus: mathematics");
    });

    it("should include question type distribution for multiple types", () => {
      const userPrompt = "Generate programming questions";
      const options: PromptOptions = {
        questionTypes: ["coding", "logic"],
        numQuestions: 4
      };

      const result = PromptEngineering.enhanceUserPrompt(userPrompt, options);

      expect(result).toContain("Distribute questions across these types: coding, logic");
    });

    it("should include template examples when provided", () => {
      const userPrompt = "Create questions";
      const template: EvalTemplate = {
        id: "t1",
        name: "Test Template",
        description: "Test",
        category: "test",
        icon: null,
        prompt: "Test prompt",
        isPublic: true,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultQuestionTypes: "[]",
        defaultDifficulty: "medium",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: "[]",
        examples: '["Example question 1", "Example question 2"]',
        createdByUserId: null,
        usageCount: 0
      };

      const result = PromptEngineering.enhanceUserPrompt(userPrompt, undefined, template);

      expect(result).toContain("Example questions in this style:");
      expect(result).toContain("Example question 1");
    });
  });

  describe("validateQuestions", () => {
    it("should validate good questions", () => {
      const questions = [
        "What is the capital of France?",
        "Explain the concept of recursion in programming.",
        "How does photosynthesis work in plants?"
      ];

      const result = PromptEngineering.validateQuestions(questions);

      expect(result.valid).toHaveLength(3);
      expect(result.issues).toHaveLength(0);
    });

    it("should identify questions that are too short", () => {
      const questions = ["What?", "Valid question that is long enough?"];

      const result = PromptEngineering.validateQuestions(questions);

      expect(result.valid).toHaveLength(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("too short");
    });

    it("should identify questions that are too long", () => {
      const longQuestion = "What is " + "very ".repeat(100) + "long question?";
      const questions = [longQuestion, "Normal question?"];

      const result = PromptEngineering.validateQuestions(questions);

      expect(result.valid).toHaveLength(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("too long");
    });

    it("should identify questions with numbering", () => {
      const questions = [
        "1. What is the capital of France?",
        "What is the capital of Germany?"
      ];

      const result = PromptEngineering.validateQuestions(questions);

      expect(result.valid).toHaveLength(1);
      expect(result.issues).toHaveLength(1);
      expect(result.issues[0]).toContain("contains numbering");
    });

    it("should validate imperative questions without question marks", () => {
      const questions = [
        "What is recursion?",
        "Explain the concept of inheritance",
        "Describe how databases work"
      ];

      const result = PromptEngineering.validateQuestions(questions);

      expect(result.valid).toHaveLength(3);
      expect(result.issues).toHaveLength(0);
    });
  });

  describe("getQualityImprovements", () => {
    it("should suggest diversity improvements for repetitive questions", () => {
      const questions = [
        "What is the capital of France?",
        "What is the capital of Germany?",
        "What is the capital of Spain?"
      ];

      const result = PromptEngineering.getQualityImprovements(questions);

      expect(result).toContain("Consider varying question starters for better diversity");
    });

    it("should suggest more detail for short questions", () => {
      const questions = [
        "What is AI?",
        "What is ML?",
        "What is DL?"
      ];

      const result = PromptEngineering.getQualityImprovements(questions);

      expect(result).toContain("Questions could be more detailed and specific");
    });

    it("should return no suggestions for well-varied questions", () => {
      const questions = [
        "What is the fundamental principle behind machine learning algorithms?",
        "Explain how neural networks process information through multiple layers.",
        "Describe the differences between supervised and unsupervised learning approaches.",
        "How do you evaluate the performance of a classification model?"
      ];

      const result = PromptEngineering.getQualityImprovements(questions);

      expect(result).toHaveLength(0);
    });
  });

  describe("error handling", () => {
    it("should handle invalid template examples gracefully", () => {
      const template: EvalTemplate = {
        id: "t1",
        name: "Test Template",
        description: "Test",
        category: "test",
        icon: null,
        prompt: "Test prompt",
        isPublic: true,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultQuestionTypes: "[]",
        defaultDifficulty: "medium",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: "[]",
        examples: 'invalid json',
        createdByUserId: null,
        usageCount: 0
      };

      const result = PromptEngineering.enhanceUserPrompt("Test", undefined, template);

      expect(result).toBe("Test"); // Should not crash, just return original prompt
    });

    it("should handle empty questions array", () => {
      const result = PromptEngineering.validateQuestions([]);

      expect(result.valid).toHaveLength(0);
      expect(result.issues).toHaveLength(0);
    });

    it("should handle undefined options gracefully", () => {
      const result = PromptEngineering.buildSystemPrompt(3);

      expect(result).toContain("Generate exactly 3 distinct questions");
    });
  });
});