import { describe, it, expect, vi, beforeEach } from "vitest";
import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";
import { createModel } from "./modelController"; // Adjust path if necessary

// Mock Prisma client with factory function
vi.mock("../db/prisma", () => ({
  default: {
    model: {
      create: vi.fn(),
    },
  },
}));

// Mock Express Request, Response, NextFunction
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

// Hold original process.env
const originalEnv = process.env;

describe("Model Controller - createModel", () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    // Reset mocks before each test
    vi.resetAllMocks();
    mockPrisma = (await import("../db/prisma")).default;
    // Restore original process.env, then modify for the test
    process.env = { ...originalEnv };
  });

  it("should create a model successfully with valid input", async () => {
    const reqBody = {
      name: "Test Model",
      baseUrl: "http://example.com",
      apiKeyEnvVar: "TEST_API_KEY",
      inputTokenCost: 0.001,
      outputTokenCost: 0.002,
    };
    const req = mockRequest(reqBody);
    const res = mockResponse();
    const expectedModel = {
      ...reqBody,
      id: "1",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Mock environment variable
    process.env.TEST_API_KEY = "sk-testkey";
    // Mock Prisma response
    mockPrisma.model.create.mockResolvedValue(expectedModel);

    await createModel(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(201);
    expect(res.json).toHaveBeenCalledWith({
      success: true,
      data: expectedModel,
    });
    expect(mockPrisma.model.create).toHaveBeenCalledWith({ data: reqBody });
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 400 if required fields are missing", async () => {
    const reqBody = { name: "Test Model" }; // Missing fields
    const req = mockRequest(reqBody);
    const res = mockResponse();

    await createModel(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { message: expect.stringContaining("Missing required fields") },
      })
    );
    expect(mockPrisma.model.create).not.toHaveBeenCalled();
    expect(mockNext).not.toHaveBeenCalled();
  });

  it("should return 400 if token costs are not positive", async () => {
    const reqBody = {
      name: "Test Model",
      baseUrl: "http://example.com",
      apiKeyEnvVar: "TEST_API_KEY",
      inputTokenCost: 0,
      outputTokenCost: 0.002,
    };
    const req = mockRequest(reqBody);
    const res = mockResponse();

    await createModel(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: { message: "Token costs must be positive numbers." },
      })
    );
    expect(mockPrisma.model.create).not.toHaveBeenCalled();
  });

  it("should return 400 if apiKeyEnvVar does not exist in environment", async () => {
    const reqBody = {
      name: "Test Model",
      baseUrl: "http://example.com",
      apiKeyEnvVar: "NON_EXISTENT_KEY",
      inputTokenCost: 0.001,
      outputTokenCost: 0.002,
    };
    const req = mockRequest(reqBody);
    const res = mockResponse();

    // Ensure the env var is NOT set
    delete process.env.NON_EXISTENT_KEY;

    await createModel(req, res, mockNext);

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.json).toHaveBeenCalledWith(
      expect.objectContaining({
        success: false,
        error: {
          message: `API Key environment variable 'NON_EXISTENT_KEY' not found on the server.`,
        },
      })
    );
    expect(mockPrisma.model.create).not.toHaveBeenCalled();
  });

  it("should call next with error if Prisma create fails", async () => {
    const reqBody = {
      name: "Test Model Fail",
      baseUrl: "http://example.com/fail",
      apiKeyEnvVar: "TEST_API_KEY_FAIL",
      inputTokenCost: 0.001,
      outputTokenCost: 0.002,
    };
    const req = mockRequest(reqBody);
    const res = mockResponse();
    const prismaError = new Error("Prisma create failed");

    process.env.TEST_API_KEY_FAIL = "sk-failkey";
    mockPrisma.model.create.mockRejectedValue(prismaError);

    await createModel(req, res, mockNext);

    expect(mockPrisma.model.create).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled();
    expect(res.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(prismaError);
  });

  // Optional: Test specific Prisma errors like unique constraint violation
  it("should call next with Prisma unique constraint error", async () => {
    const reqBody = {
      name: "Duplicate Model",
      baseUrl: "http://example.com/dup",
      apiKeyEnvVar: "TEST_API_KEY_DUP",
      inputTokenCost: 0.001,
      outputTokenCost: 0.002,
    };
    const req = mockRequest(reqBody);
    const res = mockResponse();
    // Simulate Prisma P2002 error
    const prismaError = new Prisma.PrismaClientKnownRequestError(
      "Unique constraint failed",
      { code: "P2002", clientVersion: "test", meta: { target: ["name"] } }
    );

    process.env.TEST_API_KEY_DUP = "sk-dupkey";
    mockPrisma.model.create.mockRejectedValue(prismaError);

    await createModel(req, res, mockNext);

    expect(mockPrisma.model.create).toHaveBeenCalledTimes(1);
    expect(res.status).not.toHaveBeenCalled(); // Error handler should handle status
    expect(res.json).not.toHaveBeenCalled();
    expect(mockNext).toHaveBeenCalledWith(prismaError);
    // Note: We are not testing the error handler itself here, just that it's called.
  });
});
