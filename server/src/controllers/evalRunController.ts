import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService"; // Needed for execution logic later
import TokenizerService from "../services/tokenizerService"; // Needed for cost calc later
import { calculateCost } from "../utils/costUtils"; // Needed for cost calc later
import { Model, ModelPrice } from "@prisma/client"; // Import Model and ModelPrice types
import { Prisma } from "@prisma/client"; // Import Prisma namespace

// Helper to get the latest price record for cost calculation
// Modify to accept the model identifier for lookup
async function getLatestModelPriceData(
  modelIdentifier: string | null // Use the canonical identifier
): Promise<ModelPrice | null> {
  // if (!modelId) return null; // Old check based on DB ID
  if (!modelIdentifier) {
    console.warn("Cannot fetch pricing data: modelIdentifier is null.");
    return null;
  }
  try {
    // Query using the modelIdentifier against ModelID and CanonicalID
    const latestPrice = await prisma.modelPrice.findFirst({
      where: {
        OR: [{ ModelID: modelIdentifier }, { CanonicalID: modelIdentifier }],
      },
      orderBy: { Date: "desc" },
    });

    // Keep logic to find the absolute latest for the canonical ID
    if (latestPrice) {
      const latestCanonicalPrice = await prisma.modelPrice.findFirst({
        where: { CanonicalID: latestPrice.CanonicalID },
        orderBy: { Date: "desc" },
      });
      return latestCanonicalPrice || latestPrice;
    } else {
      return null;
    }
  } catch (error) {
    console.error(
      `Failed to fetch latest price for model identifier ${modelIdentifier}:`,
      error
    );
    return null; // Don't fail the whole run if pricing lookup fails
  }
}

interface CreateEvalRunInput {
  evalId: string;
  modelIds: string[]; // Array of Model IDs to run against
  // Add run configuration later (e.g., specific prompts per model?)
}

// Placeholder for the main execution logic (will be filled in Step 39/40)
const executeRun = async (
  evalRunId: string,
  evalId: string,
  modelIds: string[]
) => {
  console.log(
    `Starting execution for EvalRun: ${evalRunId}, Eval: ${evalId}, Models: ${modelIds.join(
      ", "
    )}`
  );
  let runStatus: "COMPLETED" | "FAILED" = "COMPLETED"; // Assume success initially
  let totalErrors = 0;

  try {
    // 1. Fetch Eval Questions and Target Model basic info (IDs are sufficient here)
    const evalData = await prisma.eval.findUnique({
      where: { id: evalId },
      include: { questions: { select: { id: true, text: true } } }, // Only need question id and text
    });
    // Check if target models exist (improves error handling)
    const targetModelCount = await prisma.model.count({
      where: { id: { in: modelIds } },
    });

    if (!evalData || !evalData.questions || evalData.questions.length === 0) {
      throw new Error(`Eval ${evalId} not found or has no questions.`);
    }
    if (targetModelCount !== modelIds.length) {
      console.error(
        `Mismatch in target model IDs. Expected ${modelIds.length}, found ${targetModelCount} in DB.`
      );
      throw new Error(
        `One or more target models specified in [${modelIds.join(
          ", "
        )}] not found in the database.`
      );
    }
    // Fetch full model details (including modelIdentifier) for LlmService calls and pricing lookup
    const targetModels = await prisma.model.findMany({
      where: { id: { in: modelIds } },
    });
    const modelMap = new Map(targetModels.map((m: Model) => [m.id, m]));

    // 2. Update EvalRun status to RUNNING
    await prisma.evalRun.update({
      where: { id: evalRunId },
      data: { status: "RUNNING" },
    });

    // 3. Execute questions against models
    for (const question of evalData.questions) {
      console.log(
        `Executing Question ${question.id} against ${targetModels.length} models...`
      );

      // Create promises for all model calls for this question
      const promises = targetModels.map((model: Model) =>
        LlmService.getLLMCompletion(model, question.text).then((result) => ({
          modelId: model.id,
          questionId: question.id,
          questionText: question.text,
          modelIdentifier: model.modelIdentifier, // Pass identifier along for pricing
          ...result,
        }))
      );

      // Run calls in parallel and wait for all to settle
      const results = await Promise.allSettled(promises);

      // 4. Process results and save responses
      const responsesToCreate: Prisma.ResponseCreateManyInput[] = [];

      // Fetch latest prices for all models used in this batch *once*
      const priceDataMap = new Map<string, ModelPrice | null>();
      for (const model of targetModels) {
        // Use the fetched models list
        // Use modelIdentifier for the lookup key
        const priceData = await getLatestModelPriceData(model.modelIdentifier);
        priceDataMap.set(model.id, priceData); // Still map by internal ID for easy access later
      }

      for (const result of results) {
        if (result.status === "fulfilled") {
          const {
            modelId, // Keep internal modelId for linking in Response table
            questionId,
            questionText,
            responseText,
            error,
            executionTimeMs,
            // Note: modelIdentifier was passed but isn't directly saved in Response
          } = result.value;

          let inputTokens: number | undefined = undefined;
          let outputTokens: number | undefined = undefined;
          let cost: number | undefined = undefined;
          let calculatedCost = 0;
          let costCalculationError = false;
          let costErrorMsg: string | null = null; // Specific cost error message

          // Find the latest price data for this specific model using its internal ID as the map key
          const latestPriceData = priceDataMap.get(modelId);

          if (!error && responseText) {
            // Only calculate cost if LLM call succeeded
            if (latestPriceData) {
              // Check if pricing data was found
              try {
                inputTokens = TokenizerService.countTokens(questionText);
                outputTokens = TokenizerService.countTokens(responseText);

                // Convert per-1M costs to per-1k costs for the calculateCost function
                const inputCostPer1k = latestPriceData.InputUSDPer1M / 1000;
                const outputCostPer1k = latestPriceData.OutputUSDPer1M / 1000;

                // Create a temporary object matching the structure expected by calculateCost
                const pricingForCalc = {
                  inputTokenCost: inputCostPer1k,
                  outputTokenCost: outputCostPer1k,
                };

                calculatedCost = calculateCost(
                  pricingForCalc,
                  inputTokens,
                  outputTokens
                );
                cost = calculatedCost; // Assign calculated cost
              } catch (tokenError: any) {
                console.error(
                  `Token/Cost calculation error for Q:${questionId}, M:${modelId}:`,
                  tokenError
                );
                costCalculationError = true;
                costErrorMsg = "Token/cost calculation failed";
              }
            } else {
              // console.warn(
              //     `Could not find pricing data for model ${modelId}. Cost will be null.`
              // );
              costCalculationError = true;
              costErrorMsg = "Pricing data not found";
            }
          } else if (error) {
            // If there was an LLM error, cost calculation is skipped
            costCalculationError = true;
            costErrorMsg = "Skipped (LLM error)";
            totalErrors++;
          }

          // Combine original error with cost error if needed
          const finalError = error
            ? `${error}${costCalculationError ? ` (${costErrorMsg})` : ""}`
            : costCalculationError
            ? costErrorMsg
            : null;

          responsesToCreate.push({
            evalRunId: evalRunId,
            questionId: questionId,
            modelId: modelId,
            responseText: responseText,
            // Save combined error message
            error: finalError,
            executionTimeMs: executionTimeMs,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            cost: cost,
          });
        } else {
          totalErrors++;
          console.error(
            `Promise rejected for one or more models on question ${question.id}:`,
            result.reason
          );
          // TODO: Potentially create response record with error state here?
        }
      }

      if (responsesToCreate.length > 0) {
        try {
          await prisma.response.createMany({
            data: responsesToCreate,
            // skipDuplicates: true, // Not supported in SQLite
          });
        } catch (dbError) {
          console.error("Database error saving responses:", dbError);
          runStatus = "FAILED";
          totalErrors += responsesToCreate.length;
        }
      }
    } // End of questions loop

    // Determine final status
    if (totalErrors > 0 && runStatus !== "FAILED") {
      // Mark as COMPLETED_WITH_ERRORS if only cost errors occurred?
      // For now, any error marks as FAILED.
      runStatus = "FAILED";
    }
  } catch (error) {
    console.error(
      `Critical error during execution for EvalRun ${evalRunId}:`,
      error
    );
    runStatus = "FAILED";
  } finally {
    // 5. Update EvalRun final status
    try {
      await prisma.evalRun.update({
        where: { id: evalRunId },
        data: { status: runStatus, updatedAt: new Date() },
      });
      console.log(
        `Finished execution for EvalRun: ${evalRunId} with status: ${runStatus}`
      );
    } catch (updateError) {
      console.error(
        `Failed to update EvalRun ${evalRunId} final status to ${runStatus}:`,
        updateError
      );
    }
  }
};

export const createEvalRun = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { evalId, modelIds } = req.body as CreateEvalRunInput;

  if (!evalId || !Array.isArray(modelIds) || modelIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "Missing required fields: evalId and a non-empty array of modelIds.",
      },
    });
  }

  try {
    // Create the initial EvalRun record with PENDING status
    const newEvalRun = await prisma.evalRun.create({
      data: {
        evalId: evalId,
        status: "PENDING",
      },
    });

    // Immediately return the run ID to the client
    res.status(202).json({ success: true, data: { evalRunId: newEvalRun.id } });

    // Start the execution asynchronously (don't await)
    executeRun(newEvalRun.id, evalId, modelIds);
  } catch (error) {
    // Handle errors during the initial record creation
    console.error("Error creating EvalRun record:", error);
    // Note: We cannot easily pass this to the main error handler as the response is already sent.
    // Proper error handling for async background tasks often involves storing error state in the DB.
    // For now, log it.
    // Potentially update the run status to FAILED here if creation failed badly?
    // next(error); // Can't use next() after sending response
  }
};

export const getEvalRunResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalRunId } = req.params;

  try {
    const evalRun = await prisma.evalRun.findUnique({
      where: { id: evalRunId },
      include: {
        eval: {
          // Include basic eval info
          select: { id: true, name: true },
        },
        responses: {
          // Include all responses for this run
          orderBy: [
            // Order for consistent display
            { question: { createdAt: "asc" } }, // Group by question first
            { model: { name: "asc" } }, // Then by model name
          ],
          include: {
            question: {
              // Include question text
              select: { id: true, text: true },
            },
            model: {
              // Include model name
              select: { id: true, name: true },
            },
            scores: true, // Include any scores associated with the response
          },
        },
      },
    });

    if (!evalRun) {
      return res.status(404).json({
        success: false,
        error: { message: `EvalRun with ID ${evalRunId} not found.` },
      });
    }

    // TODO: Consider pagination for responses if runs can be very large

    res.status(200).json({ success: true, data: evalRun });
  } catch (error) {
    next(error);
  }
};
// NEW: Controller to get results for the LATEST completed/failed run of an Eval
export const getLatestEvalRunResults = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalId } = req.params; // Get evalId from route param

  try {
    // Find the latest run for this eval that is finished (COMPLETED or FAILED)
    const latestFinishedRun = await prisma.evalRun.findFirst({
      where: {
        evalId: evalId,
        status: { in: ["COMPLETED", "FAILED"] },
      },
      orderBy: {
        createdAt: "desc", // Get the most recent one
      },
      include: {
        eval: { select: { id: true, name: true } },
        responses: {
          include: {
            question: { select: { id: true, text: true, createdAt: true } },
            model: { select: { id: true, name: true } },
            scores: true,
          },
          orderBy: [
            { question: { createdAt: "asc" } },
            { model: { name: "asc" } },
          ],
        },
      },
    });

    if (!latestFinishedRun) {
      // It's not an error, just means no runs completed yet
      return res.status(200).json({
        success: true,
        data: null,
        message: "No completed runs found for this evaluation.",
      });
    }

    res.status(200).json({ success: true, data: latestFinishedRun });
  } catch (error) {
    next(error);
  }
};
