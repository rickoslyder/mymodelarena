import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";

/**
 * Deletes a specific response by its ID.
 */
export const deleteResponse = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { responseId } = req.params;

  if (!responseId) {
    return res.status(400).json({
      success: false,
      error: { message: "Response ID is required in the URL parameters." },
    });
  }

  try {
    // Check if response exists before attempting delete (optional but good practice)
    const responseExists = await prisma.response.findUnique({
      where: { id: responseId },
      select: { id: true }, // Only select id for efficiency
    });

    if (!responseExists) {
      return res.status(404).json({
        success: false,
        error: { message: `Response with ID ${responseId} not found.` },
      });
    }

    // Perform the deletion
    await prisma.response.delete({
      where: { id: responseId },
    });

    console.log(`Deleted Response with ID: ${responseId}`);
    // Send success response with no content
    res.status(204).send();
  } catch (error) {
    console.error(`Error deleting response ${responseId}:`, error);
    // Pass error to the centralized error handler
    next(error);
  }
};
