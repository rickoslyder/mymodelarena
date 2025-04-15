import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";

interface UpdateQuestionInput {
  text?: string;
}

export const updateQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { questionId } = req.params;
  const { text } = req.body as UpdateQuestionInput;

  if (!text) {
    return res.status(400).json({
      success: false,
      error: { message: "Question text is required." },
    });
  }

  try {
    const updatedQuestion = await prisma.question.update({
      where: { id: questionId },
      data: {
        text,
        version: { increment: 1 }, // Increment version on update
        updatedAt: new Date(),
      },
    });
    res.status(200).json({ success: true, data: updatedQuestion });
  } catch (error) {
    next(error); // Handles P2025 (Question not found)
  }
};

export const deleteQuestion = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { questionId } = req.params;
  // Note: evalId is also in params (/:evalId/questions/:questionId) but not strictly needed for delete by ID

  try {
    await prisma.question.delete({
      where: { id: questionId },
    });
    res.status(204).send();
  } catch (error) {
    next(error); // Handles P2025
  }
};
