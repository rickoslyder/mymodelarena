import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";

// Input type for creating a model (adjust as needed)
interface CreateModelInput {
  name: string;
  baseUrl: string;
  apiKeyEnvVar: string;
  inputTokenCost: number;
  outputTokenCost: number;
}

export const createModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name, baseUrl, apiKeyEnvVar, inputTokenCost, outputTokenCost } =
    req.body as CreateModelInput;

  // --- Basic Validation ---
  if (
    !name ||
    !baseUrl ||
    !apiKeyEnvVar ||
    inputTokenCost == null ||
    outputTokenCost == null
  ) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "Missing required fields: name, baseUrl, apiKeyEnvVar, inputTokenCost, outputTokenCost",
      },
    });
  }

  if (inputTokenCost <= 0 || outputTokenCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Token costs must be positive numbers." },
    });
  }

  // Check if the specified API key environment variable exists on the server
  if (!process.env[apiKeyEnvVar]) {
    return res.status(400).json({
      success: false,
      error: {
        message: `API Key environment variable '${apiKeyEnvVar}' not found on the server.`,
      },
    });
  }
  // DO NOT log or return the actual key!

  try {
    const newModel = await prisma.model.create({
      data: {
        name,
        baseUrl,
        apiKeyEnvVar,
        inputTokenCost,
        outputTokenCost,
      },
    });
    // Return the created model data (excluding sensitive info if any)
    res.status(201).json({ success: true, data: newModel });
  } catch (error) {
    // Pass error to the centralized error handler
    next(error);
  }
};

// Add other controller functions here (getAllModels, getModelById, updateModel, deleteModel)
export const getAllModels = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const models = await prisma.model.findMany({
      // Optionally select fields to exclude sensitive data if needed in future
      // select: { id: true, name: true, baseUrl: true, inputTokenCost: true, outputTokenCost: true, createdAt: true, updatedAt: true }
      orderBy: {
        createdAt: "desc", // Default sort order
      },
    });
    res.status(200).json({ success: true, data: models });
  } catch (error) {
    next(error);
  }
};

export const getModelById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    const model = await prisma.model.findUniqueOrThrow({
      where: { id },
      // select: { ... } // Optional field selection
    });
    res.status(200).json({ success: true, data: model });
  } catch (error) {
    // Let the central error handler manage Prisma's RecordNotFound error (P2025)
    next(error);
  }
};

// Input type for updating a model (allow partial updates)
interface UpdateModelInput {
  name?: string;
  baseUrl?: string;
  apiKeyEnvVar?: string;
  provider?: string;
  modelIdentifier?: string;
  inputTokenCost?: number;
  outputTokenCost?: number;
}

export const updateModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const {
    name,
    baseUrl,
    apiKeyEnvVar,
    provider,
    modelIdentifier,
    inputTokenCost,
    outputTokenCost,
  } = req.body as UpdateModelInput;

  // --- Basic Validation ---
  if (
    !name &&
    !baseUrl &&
    !apiKeyEnvVar &&
    !provider &&
    !modelIdentifier &&
    inputTokenCost === undefined &&
    outputTokenCost === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: { message: "No update fields provided." },
    });
  }

  if (inputTokenCost !== undefined && inputTokenCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Input token cost must be a positive number." },
    });
  }
  if (outputTokenCost !== undefined && outputTokenCost <= 0) {
    return res.status(400).json({
      success: false,
      error: { message: "Output token cost must be a positive number." },
    });
  }

  if (apiKeyEnvVar && !process.env[apiKeyEnvVar]) {
    return res.status(400).json({
      success: false,
      error: {
        message: `API Key environment variable '${apiKeyEnvVar}' not found on the server.`,
      },
    });
  }

  try {
    const updatedModel = await prisma.model.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(baseUrl !== undefined && { baseUrl }),
        ...(apiKeyEnvVar !== undefined && { apiKeyEnvVar }),
        ...(provider !== undefined && { provider }),
        ...(modelIdentifier !== undefined && { modelIdentifier }),
        ...(inputTokenCost !== undefined && { inputTokenCost }),
        ...(outputTokenCost !== undefined && { outputTokenCost }),
        updatedAt: new Date(),
      },
    });
    res.status(200).json({ success: true, data: updatedModel });
  } catch (error) {
    next(error);
  }
};

export const deleteModel = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    // Optional: Add check here to prevent deleting models with associated responses/runs if needed
    // const responsesExist = await prisma.response.findFirst({ where: { modelId: id } });
    // if (responsesExist) { ... return 409 Conflict ... }

    await prisma.model.delete({
      where: { id },
    });
    // Send No Content success status
    res.status(204).send();
  } catch (error) {
    // Handles potential P2025 (Record to delete not found)
    next(error);
  }
};
