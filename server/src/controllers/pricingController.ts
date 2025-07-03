import { Request, Response, NextFunction } from "express";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

/**
 * Get the latest pricing record for a given model ID (alias or snapshot).
 * It searches by both ModelID and CanonicalID to ensure the latest snapshot
 * for an alias is found if the alias itself doesn't have a direct recent entry.
 */
export const getLatestPrice = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { modelId } = req.query;

  if (!modelId || typeof modelId !== "string") {
    return res
      .status(400)
      .json({
        success: false,
        error: "Missing or invalid modelId query parameter",
      });
  }

  try {
    const latestPrice = await prisma.modelPrice.findFirst({
      where: {
        OR: [
          { ModelID: modelId },
          { CanonicalID: modelId }, // Check if the provided ID is a canonical ID itself
        ],
      },
      orderBy: {
        Date: "desc",
      },
    });

    // If we found a price using the modelId directly or via its potential canonicalId,
    // we need to ensure we return the absolute latest price associated with its CanonicalID.
    // This handles cases where an alias (e.g., gpt-4o) has an older entry than its snapshot (gpt-4o-2024-11-20)
    if (latestPrice) {
      const latestCanonicalPrice = await prisma.modelPrice.findFirst({
        where: {
          CanonicalID: latestPrice.CanonicalID, // Use the CanonicalID from the record we found
        },
        orderBy: {
          Date: "desc",
        },
      });

      if (latestCanonicalPrice) {
        return res.json({ success: true, data: latestCanonicalPrice });
      } else {
        // Should technically not happen if latestPrice was found, but as a fallback:
        return res.json({ success: true, data: latestPrice });
      }
    } else {
      // If the initial search found nothing by ModelID or CanonicalID, then no price exists
      return res
        .status(404)
        .json({
          success: false,
          error: `No pricing found for modelId: ${modelId}`,
        });
    }
  } catch (error) {
    next(error); // Pass errors to the centralized error handler
  }
};

/**
 * Get the full pricing history for a given model ID (alias or snapshot).
 * It retrieves all records associated with the CanonicalID of the found model.
 */
export const getPriceHistory = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { modelId } = req.query;

  if (!modelId || typeof modelId !== "string") {
    return res
      .status(400)
      .json({
        success: false,
        error: "Missing or invalid modelId query parameter",
      });
  }

  try {
    // First find *any* record matching the modelId to get its CanonicalID
    const modelReference = await prisma.modelPrice.findFirst({
      where: {
        OR: [{ ModelID: modelId }, { CanonicalID: modelId }],
      },
      select: {
        CanonicalID: true,
      },
    });

    if (!modelReference) {
      return res
        .status(404)
        .json({
          success: false,
          error: `No pricing records found referenceing modelId: ${modelId}`,
        });
    }

    // Then fetch all records matching that CanonicalID
    const history = await prisma.modelPrice.findMany({
      where: {
        CanonicalID: modelReference.CanonicalID,
      },
      orderBy: {
        Date: "asc", // Return history in chronological order
      },
    });

    res.json({ success: true, data: history });
  } catch (error) {
    next(error);
  }
};
