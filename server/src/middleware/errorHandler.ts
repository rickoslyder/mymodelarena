import { Request, Response, NextFunction } from "express";
import { Prisma } from "@prisma/client";

interface AppError extends Error {
  statusCode?: number;
}

const errorHandler = (
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
) => {
  console.error("Error occurred:", err);

  let statusCode = err.statusCode || 500;
  let message = err.message || "Internal Server Error";

  // Handle specific Prisma errors
  if (err instanceof Prisma.PrismaClientKnownRequestError) {
    // Unique constraint violation
    if (err.code === "P2002") {
      statusCode = 409; // Conflict
      // Extract target field from meta if possible, otherwise generic message
      const target = err.meta?.target
        ? (err.meta.target as string[]).join(", ")
        : "field";
      message = `A record with this ${target} already exists.`;
    }
    // Record not found (e.g., for findUniqueOrThrow)
    else if (err.code === "P2025") {
      statusCode = 404; // Not Found
      message = (err.meta?.cause as string) || "Resource not found.";
    }
    // Add more Prisma error codes as needed
  }
  // Handle other specific error types if necessary
  // else if (err instanceof CustomValidationError) { ... }

  res.status(statusCode).json({
    success: false,
    error: {
      message: message,
      // Optionally include stack trace in development
      // stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    },
  });
};

export default errorHandler;
