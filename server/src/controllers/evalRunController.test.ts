import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import * as evalRunController from "./evalRunController";

// Mock Prisma client with factory function
vi.mock("../db/prisma", () => ({
  default: {
    evalRun: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      update: vi.fn(),
    },
    eval: {
      findUnique: vi.fn(),
    },
    model: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    response: {
      createMany: vi.fn(),
    },
    modelPrice: {
      findFirst: vi.fn(),
    },
  }
}));
vi.mock("../services/llmService");
vi.mock("../services/tokenizerService");
vi.mock("../utils/costUtils");

// Mock Express req/res/next
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
  return res as Response;
};

const mockNext = vi.fn() as NextFunction;

describe("EvalRunController", () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetAllMocks();
    mockPrisma = (await import("../db/prisma")).default;
  });

  describe("createEvalRun", () => {
    it("should create eval run successfully", async () => {
      const reqBody = {
        evalId: "eval-1",
        modelIds: ["model-1", "model-2"],
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();

      const createdRun = {
        id: "run-1",
        evalId: "eval-1",
        status: "PENDING",
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      mockPrisma.evalRun.create.mockResolvedValue(createdRun);

      await evalRunController.createEvalRun(req, res, mockNext);

      expect(mockPrisma.evalRun.create).toHaveBeenCalledWith({
        data: {
          evalId: "eval-1",
          status: "PENDING",
        },
      });

      expect(res.status).toHaveBeenCalledWith(202);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: { evalRunId: "run-1" },
      });
    });

    it("should return 400 for missing evalId", async () => {
      const reqBody = {
        modelIds: ["model-1"],
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();

      await evalRunController.createEvalRun(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Missing required fields: evalId and a non-empty array of modelIds.",
        },
      });
    });

    it("should return 400 for missing modelIds", async () => {
      const reqBody = {
        evalId: "eval-1",
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();

      await evalRunController.createEvalRun(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Missing required fields: evalId and a non-empty array of modelIds.",
        },
      });
    });

    it("should return 400 for empty modelIds array", async () => {
      const reqBody = {
        evalId: "eval-1",
        modelIds: [],
      };
      const req = mockRequest(reqBody);
      const res = mockResponse();

      await evalRunController.createEvalRun(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: {
          message: "Missing required fields: evalId and a non-empty array of modelIds.",
        },
      });
    });
  });

  describe("getEvalRunStatus", () => {
    it("should return run status successfully", async () => {
      const req = mockRequest({}, { id: "run-1" });
      const res = mockResponse();

      const mockEvalRun = {
        id: "run-1",
        status: "RUNNING",
        createdAt: new Date("2024-01-01"),
        updatedAt: new Date("2024-01-01"),
        eval: {
          id: "eval-1",
          name: "Test Eval",
          questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }],
        },
        responses: [
          { id: "r1", questionId: "q1", modelId: "m1", error: null },
          { id: "r2", questionId: "q2", modelId: "m1", error: null },
          { id: "r3", questionId: "q1", modelId: "m2", error: "Failed" },
        ],
      };

      mockPrisma.evalRun.findUnique.mockResolvedValue(mockEvalRun);

      await evalRunController.getEvalRunStatus(req, res, mockNext);

      expect(mockPrisma.evalRun.findUnique).toHaveBeenCalledWith({
        where: { id: "run-1" },
        select: expect.objectContaining({
          id: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }),
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: expect.objectContaining({
          id: "run-1",
          status: "RUNNING",
          progress: {
            percentage: 100, // 3 responses / 3 questions = 100%
            totalQuestions: 3,
            totalResponses: 3,
            successfulResponses: 2,
            failedResponses: 1,
          },
        }),
      });
    });

    it("should return 404 for non-existent run", async () => {
      const req = mockRequest({}, { id: "non-existent" });
      const res = mockResponse();

      mockPrisma.evalRun.findUnique.mockResolvedValue(null);

      await evalRunController.getEvalRunStatus(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "EvalRun with ID non-existent not found." },
      });
    });

    it("should calculate progress correctly with partial completion", async () => {
      const req = mockRequest({}, { id: "run-1" });
      const res = mockResponse();

      const mockEvalRun = {
        id: "run-1",
        status: "RUNNING",
        createdAt: new Date(),
        updatedAt: new Date(),
        eval: {
          id: "eval-1",
          name: "Test Eval",
          questions: [{ id: "q1" }, { id: "q2" }, { id: "q3" }, { id: "q4" }],
        },
        responses: [
          { id: "r1", questionId: "q1", modelId: "m1", error: null },
          { id: "r2", questionId: "q2", modelId: "m1", error: null },
        ],
      };

      mockPrisma.evalRun.findUnique.mockResolvedValue(mockEvalRun);

      await evalRunController.getEvalRunStatus(req, res, mockNext);

      const responseData = (res.json as any).mock.calls[0][0];
      expect(responseData.data.progress).toEqual({
        percentage: 50, // 2 responses / 4 questions = 50%
        totalQuestions: 4,
        totalResponses: 2,
        successfulResponses: 2,
        failedResponses: 0,
      });
    });

    it("should handle database errors", async () => {
      const req = mockRequest({}, { id: "run-1" });
      const res = mockResponse();
      const dbError = new Error("Database error");

      mockPrisma.evalRun.findUnique.mockRejectedValue(dbError);

      await evalRunController.getEvalRunStatus(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });

  describe("getEvalRunResults", () => {
    it("should return run results successfully", async () => {
      const req = mockRequest({}, { id: "run-1" });
      const res = mockResponse();

      const mockEvalRun = {
        id: "run-1",
        status: "COMPLETED",
        eval: {
          id: "eval-1",
          name: "Test Eval",
        },
        responses: [
          {
            id: "r1",
            responseText: "Response 1",
            error: null,
            question: { id: "q1", text: "Question 1" },
            model: { id: "m1", name: "Model 1" },
            scores: [],
          },
        ],
      };

      mockPrisma.evalRun.findUnique.mockResolvedValue(mockEvalRun);

      await evalRunController.getEvalRunResults(req, res, mockNext);

      expect(mockPrisma.evalRun.findUnique).toHaveBeenCalledWith({
        where: { id: "run-1" },
        include: expect.objectContaining({
          eval: { select: { id: true, name: true } },
          responses: expect.objectContaining({
            include: expect.objectContaining({
              question: { select: { id: true, text: true } },
              model: { select: { id: true, name: true } },
              scores: true,
            }),
          }),
        }),
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockEvalRun,
      });
    });

    it("should return 404 for non-existent run", async () => {
      const req = mockRequest({}, { id: "non-existent" });
      const res = mockResponse();

      mockPrisma.evalRun.findUnique.mockResolvedValue(null);

      await evalRunController.getEvalRunResults(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(404);
      expect(res.json).toHaveBeenCalledWith({
        success: false,
        error: { message: "EvalRun with ID non-existent not found." },
      });
    });
  });

  describe("getLatestEvalRunResults", () => {
    it("should return latest completed run results", async () => {
      const req = mockRequest({}, { id: "eval-1" });
      const res = mockResponse();

      const mockLatestRun = {
        id: "run-latest",
        status: "COMPLETED",
        eval: { id: "eval-1", name: "Test Eval" },
        responses: [],
      };

      mockPrisma.evalRun.findFirst.mockResolvedValue(mockLatestRun);

      await evalRunController.getLatestEvalRunResults(req, res, mockNext);

      expect(mockPrisma.evalRun.findFirst).toHaveBeenCalledWith({
        where: {
          evalId: "eval-1",
          status: { in: ["COMPLETED", "FAILED"] },
        },
        orderBy: {
          createdAt: "desc",
        },
        include: expect.any(Object),
      });

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: mockLatestRun,
      });
    });

    it("should return null when no completed runs exist", async () => {
      const req = mockRequest({}, { id: "eval-1" });
      const res = mockResponse();

      mockPrisma.evalRun.findFirst.mockResolvedValue(null);

      await evalRunController.getLatestEvalRunResults(req, res, mockNext);

      expect(res.status).toHaveBeenCalledWith(200);
      expect(res.json).toHaveBeenCalledWith({
        success: true,
        data: null,
        message: "No completed runs found for this evaluation.",
      });
    });

    it("should handle database errors", async () => {
      const req = mockRequest({}, { id: "eval-1" });
      const res = mockResponse();
      const dbError = new Error("Database error");

      mockPrisma.evalRun.findFirst.mockRejectedValue(dbError);

      await evalRunController.getLatestEvalRunResults(req, res, mockNext);

      expect(mockNext).toHaveBeenCalledWith(dbError);
    });
  });
});