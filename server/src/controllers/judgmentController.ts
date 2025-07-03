import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService";
import { Prisma } from "@prisma/client";

interface TriggerJudgingInput {
  evalId: string;
  judgeModelIds: string[];
  judgingPrompt: string;
  // Add structured criteria later (e.g., { clarity: true, relevance: true })
}

// Async helper for judging
const runJudging = async (
  evalId: string,
  judgeModelIds: string[],
  judgingPrompt: string
) => {
  console.log(
    `Starting Judge Mode for Eval ${evalId} using models: ${judgeModelIds.join(
      ", "
    )}`
  );
  try {
    // 1. Fetch Judge Models and Eval Questions
    const judgeModels = await prisma.model.findMany({
      where: { id: { in: judgeModelIds } },
    });
    const evalData = await prisma.eval.findUnique({
      where: { id: evalId },
      include: { questions: { select: { id: true, text: true } } },
    });

    if (judgeModels.length !== judgeModelIds.length)
      throw new Error("One or more judge models not found.");
    if (!evalData || !evalData.questions || evalData.questions.length === 0)
      throw new Error("Eval not found or has no questions.");

    // 2. Iterate through questions and judges
    for (const question of evalData.questions) {
      console.log(
        `Judging Question ${question.id} with ${judgeModels.length} judges...`
      );
      for (const judgeModel of judgeModels) {
        // Construct prompt for the judge LLM
        // Basic structure: provide context, question, and judging instructions
        const judgeSystemPrompt = `You are an expert evaluator assessing the quality of potential LLM evaluation questions. Evaluate the following question based ONLY on the provided instructions/criteria. Output ONLY a JSON object with keys "overallScore" (float/int, e.g., 1-10) and "justification" (string, explaining the score).`;
        const judgeUserPrompt = `Evaluation Question to Assess:
${question.text}

Judging Instructions/Criteria:
${judgingPrompt}

Output JSON (overallScore, justification):`;

        const combinedPrompt = `${judgeSystemPrompt}\n\n${judgeUserPrompt}`;

        console.log(
          `Judging Q:${question.id} with Judge ${judgeModel.name}...`
        );
        const judgeResult = await LlmService.getLLMCompletion(
          judgeModel,
          combinedPrompt,
          { max_tokens: 512 },
          true
        );

        let overallScore: number | null = null;
        let justification: string | null = null;
        let judgeError: string | null = judgeResult.error || null;

        if (!judgeError && judgeResult.responseText) {
          try {
            const parsedJson = JSON.parse(judgeResult.responseText);
            if (
              typeof parsedJson.overallScore === "number" &&
              typeof parsedJson.justification === "string"
            ) {
              overallScore = parsedJson.overallScore;
              justification = parsedJson.justification.trim();
            } else {
              console.warn(
                `Judge response for Q:${question.id}, J:${judgeModel.name} lacked score/justification:`,
                judgeResult.responseText
              );
              judgeError = "Invalid JSON format from judge LLM.";
            }
          } catch (parseError) {
            console.warn(
              `Judge response for Q:${question.id}, J:${judgeModel.name} was not valid JSON:`,
              judgeResult.responseText
            );
            judgeError = "Could not parse JSON from judge LLM.";
          }
        }

        // 3. Create Judgment record (handle potential errors, maybe don't save if error?)
        // Note: This creates a new judgment each time. Consider upsert if re-judging is needed.
        await prisma.judgment.create({
          data: {
            questionId: question.id,
            judgeModelId: judgeModel.id,
            overallScore: overallScore,
            justification: justification,
            // Add structured scores later
            // Add judgeError to schema later if needed
          },
        });
        // Optional delay
        // await new Promise(resolve => setTimeout(resolve, 200));
      } // End judge loop
    } // End question loop

    console.log(`Judge Mode completed for Eval ${evalId}`);
  } catch (error) {
    console.error(
      `Critical error during Judge Mode for Eval ${evalId}:`,
      error
    );
    // Add state to Eval or log to indicate judging failure?
  }
};

export const triggerJudging = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { evalId, judgeModelIds, judgingPrompt } =
    req.body as TriggerJudgingInput;

  if (
    !evalId ||
    !Array.isArray(judgeModelIds) ||
    judgeModelIds.length === 0 ||
    !judgingPrompt
  ) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "Missing required fields: evalId, non-empty judgeModelIds array, judgingPrompt.",
      },
    });
  }

  res.status(202).json({
    success: true,
    message: `Judge Mode initiated for eval ${evalId}.`,
  });

  runJudging(evalId, judgeModelIds, judgingPrompt);
};

// Define the type returned by the Prisma query
type JudgmentWithRelations = Prisma.JudgmentGetPayload<{
  include: {
    question: { select: { id: true; text: true } };
    judgeModel: { select: { id: true; name: true } };
  };
}>;

// Define the structure of the accumulator for the reduce function
interface JudgmentsGroupedByQuestion {
  [questionId: string]: {
    question: { id: string; text: string };
    judgments: Omit<JudgmentWithRelations, "question">[];
  };
}

export const getJudgmentsForEval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalId } = req.params;

  try {
    // Use the defined type for the query result
    const judgments: JudgmentWithRelations[] = await prisma.judgment.findMany({
      where: {
        question: {
          evalId: evalId,
        },
      },
      include: {
        question: { select: { id: true, text: true } },
        judgeModel: { select: { id: true, name: true } },
      },
      orderBy: [
        { question: { createdAt: "asc" } },
        { judgeModel: { name: "asc" } },
        { createdAt: "desc" },
      ],
    });

    // Group judgments, providing types for accumulator and current value
    const judgmentsByQuestion = judgments.reduce(
      (acc: JudgmentsGroupedByQuestion, judgment: JudgmentWithRelations) => {
        const qId = judgment.questionId;
        if (!acc[qId]) {
          acc[qId] = {
            question: judgment.question,
            judgments: [],
          };
        }
        const { question, ...judgmentData } = judgment;
        acc[qId].judgments.push(judgmentData);
        return acc;
      },
      {} as JudgmentsGroupedByQuestion
    ); // Initial value typed

    res.status(200).json({ success: true, data: judgmentsByQuestion });
  } catch (error) {
    next(error);
  }
};

/**
 * Deletes a specific judgment by its ID.
 */
export const deleteJudgment = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { judgmentId } = req.params;

  if (!judgmentId) {
    return res.status(400).json({
      success: false,
      error: { message: "Judgment ID is required in the URL parameters." },
    });
  }

  try {
    // Optional: Check if judgment exists
    const judgmentExists = await prisma.judgment.findUnique({
      where: { id: judgmentId },
      select: { id: true },
    });

    if (!judgmentExists) {
      return res.status(404).json({
        success: false,
        error: { message: `Judgment with ID ${judgmentId} not found.` },
      });
    }

    // Perform deletion
    await prisma.judgment.delete({
      where: { id: judgmentId },
    });

    console.log(`Deleted Judgment with ID: ${judgmentId}`);
    res.status(204).send(); // No content on successful deletion
  } catch (error) {
    console.error(`Error deleting judgment ${judgmentId}:`, error);
    next(error);
  }
};
