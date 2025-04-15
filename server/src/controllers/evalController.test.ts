import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as evalController from "./evalController";
import * as questionController from "./questionController";
import LlmService from "../services/llmService";

// Mock Prisma client
const mockPrisma = {
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
  // Add other models as needed
};
vi.mock("../db/prisma", () => ({ default: mockPrisma }));
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
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("generateEvalSet", () => {
    it("should generate eval successfully", async () => {
      const reqBody = {
        generatorModelId: "m1",
        userPrompt: "test prompt",
        numQuestions: 2,
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { responseText: "1. Question One\n2. Question Two" };
      const createdEval = {
        id: "e1",
        name: "Generated Eval...",
        questions: [{ id: "q1" }, { id: "q2" }],
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
            questions: {
              create: [{ text: "Question One" }, { text: "Question Two" }],
            },
          }),
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
      const reqBody = { generatorModelId: "m1", userPrompt: "test prompt" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { error: "LLM Error" };

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);

      await evalController.generateEvalSet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: { message: expect.stringContaining("LLM Error") },
        })
      );
      expect(mockPrisma.eval.create).not.toHaveBeenCalled();
      expect(mockNext).not.toHaveBeenCalled();
    });

    it("should return 500 if parsing fails", async () => {
      const reqBody = { generatorModelId: "m1", userPrompt: "test prompt" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { responseText: "invalid response" }; // Does not contain numbered questions

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);

      await evalController.generateEvalSet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          error: { message: expect.stringContaining("Could not parse") },
        })
      );
      expect(mockPrisma.eval.create).not.toHaveBeenCalled();
    });

    it("should return 404 if model not found", async () => {
      const reqBody = { generatorModelId: "m-not-found", userPrompt: "test" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      mockPrisma.model.findUnique.mockResolvedValue(null); // Model not found

      await evalController.generateEvalSet(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(LlmService.getLLMCompletion).not.toHaveBeenCalled();
    });

    it("should handle prisma errors via next", async () => {
      const reqBody = { generatorModelId: "m1", userPrompt: "test" };
      const req = mockRequest(reqBody);
      const res = mockResponse();
      const mockModel = { id: "m1", name: "GenModel", apiKeyEnvVar: "GEN_KEY" };
      const llmResult = { responseText: "1. Q1" };
      const dbError = new Error("DB error");

      process.env.GEN_KEY = "key";
      mockPrisma.model.findUnique.mockResolvedValue(mockModel);
      vi.mocked(LlmService.getLLMCompletion).mockResolvedValue(llmResult);
      mockPrisma.eval.create.mockRejectedValue(dbError); // Simulate DB error

      await evalController.generateEvalSet(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  // Add tests for getAllEvals, getEvalById, updateEval, deleteEval similarly
  describe("getAllEvals", () => {
    /* ... */
  });
  describe("getEvalById", () => {
    /* ... */
  });
  describe("updateEval", () => {
    /* ... */
  });
  describe("deleteEval", () => {
    /* ... */
  });
});

describe("Question Controller", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("updateQuestion", () => {
    /* ... tests ... */
  });
  describe("deleteQuestion", () => {
    /* ... tests ... */
  });
});

// Add similar describe blocks for Tag, EvalRun, Score, Judgment, Report controllers
