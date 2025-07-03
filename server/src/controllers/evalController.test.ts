import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as evalController from "./evalController";
import * as questionController from "./questionController";
import LlmService from "../services/llmService";

// Mock Prisma client with factory function
vi.mock("../db/prisma", () => ({
  default: {
    eval: {
      findMany: vi.fn(),
      findUniqueOrThrow: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    question: {
      update: vi.fn(),
      delete: vi.fn(),
    },
    model: {
      findUnique: vi.fn(),
    },
  }
}));
vi.mock("../services/llmService"); // Mock LlmService entirely

// Mock Express req/res/next (reuse from modelController.test?)
const mockRequest = (body: any = {}, params: any = {}, query: any = {}) =>
  ({
    body,
    params,
    query,
  } as Request);
const mockResponse = () => {
  const res: Partial<Response> = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  res.send = vi.fn().mockReturnValue(res);
  return res as Response;
};
const mockNext = vi.fn() as NextFunction;

describe("Eval Controller", () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetAllMocks();
    mockPrisma = (await import("../db/prisma")).default;
  });

  describe("generateEvalSet", () => {
    it("should generate eval successfully", async () => {
      const reqBody = {
        generatorModelId: "m1",
        prompt: "test prompt",
        numQuestions: 2,
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { 
        responseText: '{"questions": ["Question One", "Question Two"]}',
        error: null,
        inputTokens: 10,
        outputTokens: 20,
        executionTimeMs: 100
      };
      const createdEval = {
        id: "e1",
        name: "Generated Eval...",
        questions: [{ id: "q1", text: "Question One" }, { id: "q2", text: "Question Two" }],
      };

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);
      mockPrisma.eval.create.mockResolvedValue(createdEval);

      await evalController.generateEvalSet(req, res, mockNext);

      expect(LlmService.getLLMCompletion).toHaveBeenCalled();
      expect(mockPrisma.eval.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            generatorModelId: "m1",
            generationPrompt: "test prompt",
            questions: {
              create: [{ text: "Question One" }, { text: "Question Two" }],
            },
          }),
          include: {
            questions: true,
          },
        })
      );
      expect(res.status).toHaveBeenCalledWith(201);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: createdEval,
      });
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 500 if LLM fails", async () => {
      const reqBody = { generatorModelId: "m1", prompt: "test prompt" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { 
        error: "LLM Error",
        responseText: null,
        executionTimeMs: 50
      };

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);

      await evalController.generateEvalSet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(mockPrisma.eval.create).not.toHaveBeenCalled();
    });

    it("should return 500 if parsing fails", async () => {
      const reqBody = { generatorModelId: "m1", prompt: "test prompt" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { responseText: "invalid response" }; // Does not contain numbered questions

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);

      await evalController.generateEvalSet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(expect.any(Error));
      expect(res.status).not.toHaveBeenCalled();
      expect(mockPrisma.eval.create).not.toHaveBeenCalled();
    });

    it("should return 404 if model not found", async () => {
      const reqBody = { generatorModelId: "m-not-found", prompt: "test" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      mockPrisma.model.findUnique.mockResolvedValue(null); // Model not found

      await evalController.generateEvalSet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(vi.mocked(LlmService.getLLMCompletion)).not.toHaveBeenCalled();
    });

    it("should handle prisma errors via next", async () => {
      const reqBody = { generatorModelId: "m1", prompt: "test" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { 
        responseText: '{"questions": ["Q1"]}',
        error: null,
        executionTimeMs: 50
      };
      const dbError = new Error("DB error");

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);
      mockPrisma.eval.create.mockRejectedValue(dbError); // Simulate DB error

      await evalController.generateEvalSet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  // TODO: Add tests for getAllEvals, getEvalById, updateEval, deleteEval
});

// TODO: Add Question Controller tests
// TODO: Add Tag, EvalRun, Score, Judgment, Report controller tests
