import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService"; // Needed for execution logic later
import TokenizerService from "../services/tokenizerService"; // Needed for cost calc later
import { calculateCost } from "../utils/costUtils"; // Needed for cost calc later
import { Model } from "@prisma/client"; // Import Model type
import { Prisma } from "@prisma/client"; // Import Prisma namespace

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
    // 1. Fetch Eval Questions and Target Model Configs
    const evalData = await prisma.eval.findUnique({
      where: { id: evalId },
      include: { questions: true },
    });
    const targetModels = await prisma.model.findMany({
      where: { id: { in: modelIds } },
    });
    const modelMap = new Map(targetModels.map((m: Model) => [m.id, m])); // For easy lookup

    if (!evalData || !evalData.questions || evalData.questions.length === 0) {
      throw new Error(`Eval ${evalId} not found or has no questions.`);
    }
    if (targetModels.length !== modelIds.length) {
      throw new Error(`One or more target models not found.`);
    }

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
          questionText: question.text, // Pass question text for token calculation
          ...result,
        }))
      );

      // Run calls in parallel and wait for all to settle
      const results = await Promise.allSettled(promises);

      // 4. Process results and save responses
      const responsesToCreate = [];
      for (const result of results) {
        if (result.status === "fulfilled") {
          const {
            modelId,
            questionId,
            questionText,
            responseText,
            error,
            executionTimeMs,
          } = result.value;
          const modelConfig = modelMap.get(modelId);
          let inputTokens: number | undefined = undefined;
          let outputTokens: number | undefined = undefined;
          let cost: number | undefined = undefined;

          if (!error && responseText && modelConfig) {
            try {
              inputTokens = TokenizerService.countTokens(questionText);
              outputTokens = TokenizerService.countTokens(responseText);
              cost = calculateCost(
                modelConfig as Pick<
                  Model,
                  "inputTokenCost" | "outputTokenCost"
                >,
                inputTokens,
                outputTokens
              );
            } catch (tokenError) {
              console.error(
                `Token/Cost calculation error for Q:${questionId}, M:${modelId}:`,
                tokenError
              );
            }
          } else if (!modelConfig) {
            console.error(`Model config not found in map for ID: ${modelId}`);
          }

          if (error) {
            totalErrors++;
          }

          responsesToCreate.push({
            evalRunId: evalRunId,
            questionId: questionId,
            modelId: modelId,
            responseText: responseText,
            error: error,
            executionTimeMs: executionTimeMs,
            inputTokens: inputTokens,
            outputTokens: outputTokens,
            cost: cost,
          });
        } else {
          // Promise rejected (likely network error within LlmService or unhandled exception)
          totalErrors++;
          console.error(
            `Promise rejected for question ${question.id}:`,
            result.reason
          );
          // Need to figure out which model failed if possible, or log generically
          // For now, we might not save a specific Response record for this failure
          // Or save one with a generic error message
        }
      }

      if (responsesToCreate.length > 0) {
        await prisma.response.createMany({
          data: responsesToCreate,
          // skipDuplicates: true, // Removed - Not supported by SQLite
        });
      }
    } // End of questions loop

    // Determine final status
    if (totalErrors > 0) {
      // Define failure condition (e.g., any error? > 50% errors?)
      // For now, mark as FAILED if any error occurred
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
