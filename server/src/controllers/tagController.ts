import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { Prisma } from "@prisma/client";

interface CreateTagInput {
  name: string;
}

interface UpdateEvalTagsInput {
  tagIds: string[]; // Array of Tag IDs to associate
}

export const createTag = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { name } = req.body as CreateTagInput;
  if (!name || typeof name !== "string" || name.trim().length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Tag name is required and must be a non-empty string.",
      },
    });
  }
  try {
    const newTag = await prisma.tag.create({
      data: { name: name.trim() },
    });
    res.status(201).json({ success: true, data: newTag });
  } catch (error) {
    // Handles P2002 unique constraint violation
    next(error);
  }
};

export const getAllTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const tags = await prisma.tag.findMany({ orderBy: { name: "asc" } });
    res.status(200).json({ success: true, data: tags });
  } catch (error) {
    next(error);
  }
};

export const updateEvalTags = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalId } = req.params; // Eval ID from route param
  const { tagIds } = req.body as UpdateEvalTagsInput;

  if (!Array.isArray(tagIds)) {
    return res.status(400).json({
      success: false,
      error: { message: "tagIds must be an array of strings." },
    });
  }

  try {
    // Use a transaction to ensure atomicity
    await prisma.$transaction(async (tx: Prisma.TransactionClient) => {
      // 1. Delete existing tag associations for this eval
      await tx.evalTag.deleteMany({
        where: { evalId: evalId },
      });

      // 2. Create new associations if tagIds are provided
      if (tagIds.length > 0) {
        // Optional: Verify tags exist before creating associations
        const existingTagsCount = await tx.tag.count({
          where: { id: { in: tagIds } },
        });
        if (existingTagsCount !== tagIds.length) {
          // Find which tags don't exist (more complex query) or just throw a generic error
          throw new Error("One or more provided tag IDs do not exist."); // This will rollback transaction
        }

        await tx.evalTag.createMany({
          data: tagIds.map((tagId) => ({ evalId: evalId, tagId: tagId })),
          // skipDuplicates: true, // Should not happen after deleteMany, but good practice
        });
      }
    });

    // Use type assertion as workaround for TS error
    const includeTags = {
      tags: {
        include: {
          tag: true,
        },
      },
    } as any;

    // Fetch the updated eval with its tags to return
    const updatedEval = await prisma.eval.findUnique({
      where: { id: evalId },
      include: includeTags, // Use the typed include object
    });

    res.status(200).json({ success: true, data: updatedEval });
  } catch (error) {
    // Handles P2025 if evalId doesn't exist, or custom error from transaction
    next(error);
  }
};
