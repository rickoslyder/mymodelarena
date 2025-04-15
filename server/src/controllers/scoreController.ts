import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService"; // Ensure LlmService is imported

interface AddManualScoreInput {
  responseId: string;
  scoreValue: number; // Assume numeric score for now (e.g., 1-5)
  // justification?: string; // Optional justification for manual score?
}

export const addManualScore = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { responseId, scoreValue } = req.body as AddManualScoreInput;

  // Basic validation
  if (!responseId || typeof scoreValue !== "number") {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "Missing required fields: responseId, scoreValue (must be a number).",
      },
    });
  }

  // Optional: Add validation for score range (e.g., 1-5)
  // if (scoreValue < 1 || scoreValue > 5) { ... }

  try {
    // Use upsert to create or update the score for the response
    const newOrUpdatedScore = await prisma.score.upsert({
      where: { responseId: responseId }, // Unique identifier
      update: {
        // Fields to update if score exists
        scoreValue: scoreValue,
        scorerType: "manual",
        justification: null, // Clear justification if it was previously LLM scored
        scorerLlmId: null, // Clear LLM scorer ID
      },
      create: {
        // Fields to set if creating new score
        responseId: responseId,
        scoreValue: scoreValue,
        scorerType: "manual",
      },
    });

    res.status(200).json({ success: true, data: newOrUpdatedScore });
  } catch (error) {
    // Handle potential errors, e.g., responseId not found (if FK constraint fails)
    next(error);
  }
};

interface TriggerLlmScoringInput {
  evalRunId: string;
  scorerModelId: string;
  scoringPrompt: string;
  // Potentially add responseIds array if scoring only specific responses later
}

// Placeholder for the async scoring logic
const runLlmScoring = async (
  evalRunId: string,
  scorerModelId: string,
  scoringPrompt: string
) => {
  console.log(
    `Starting LLM scoring for EvalRun ${evalRunId} using Model ${scorerModelId}`
  );
  try {
    // 1. Fetch the Scorer Model config
    const scorerModel = await prisma.model.findUnique({
      where: { id: scorerModelId },
    });
    if (!scorerModel)
      throw new Error(`Scorer model ${scorerModelId} not found.`);

    // 2. Fetch all responses for the run that haven't been scored by this LLM yet
    //    (or fetch all and upsert scores)
    const responses = await prisma.response.findMany({
      where: {
        evalRunId: evalRunId,
        error: null, // Only score successful responses
        // Optional: Add condition to only score if no LLM score exists yet
        // scores: { none: { scorerType: 'llm' } }
      },
      include: {
        question: { select: { text: true } }, // Need question text for prompt
      },
    });

    if (responses.length === 0) {
      console.log(
        `No responses found for EvalRun ${evalRunId} eligible for LLM scoring.`
      );
      // Optionally update the run status or log completion differently
      return;
    }

    console.log(`Found ${responses.length} responses to score...`);

    // 3. Iterate and score (consider batching or parallel limits for large runs)
    for (const response of responses) {
      if (!response.responseText) continue; // Skip if response text is empty

      // Construct prompt for the scorer LLM
      const scorerSystemPrompt = `You are an impartial evaluator. Score the following response based on the provided criteria and the original question. Output ONLY a JSON object with keys "score" (float or int) and "justification" (string).`;
      const scorerUserPrompt = `Original Question: ${response.question.text}

Response to Evaluate:
${response.responseText}

Scoring Criteria/Prompt:
${scoringPrompt}

Output JSON (score, justification):`;

      // TODO: This assumes the scorer uses Chat Completions format.
      // Need to adapt if using older models or different formats.
      // For simplicity, constructing a single user prompt string here.
      const combinedPrompt = `${scorerSystemPrompt}\n\n${scorerUserPrompt}`;

      console.log(
        `Scoring Response ${response.id} with Model ${scorerModel.name}...`
      );
      const scoreResult = await LlmService.getLLMCompletion(
        scorerModel,
        combinedPrompt,
        { max_tokens: 512 },
        true
      );

      let parsedScore: number | undefined;
      let justification: string | null = null;
      let scoreError: string | null = scoreResult.error || null;

      if (!scoreError && scoreResult.responseText) {
        try {
          // Attempt to parse JSON from the response
          const parsedJson = JSON.parse(scoreResult.responseText);
          if (
            typeof parsedJson.score === "number" &&
            typeof parsedJson.justification === "string"
          ) {
            parsedScore = parsedJson.score;
            justification = parsedJson.justification.trim();
          } else {
            console.warn(
              `LLM scorer response for R:${response.id} lacked score/justification in JSON:`,
              scoreResult.responseText
            );
            scoreError = "Invalid JSON format from scorer LLM.";
          }
        } catch (parseError) {
          console.warn(
            `LLM scorer response for R:${response.id} was not valid JSON:`,
            scoreResult.responseText
          );
          scoreError = "Could not parse JSON from scorer LLM.";
        }
      }

      // 4. Upsert the Score record
      await prisma.score.upsert({
        where: { responseId: response.id },
        update: {
          scoreValue: parsedScore,
          justification: justification,
          scorerType: "llm",
          scorerLlmId: scorerModel.id,
          // Optionally store the raw scorer response or error?
        },
        create: {
          responseId: response.id,
          scoreValue: parsedScore,
          justification: justification,
          scorerType: "llm",
          scorerLlmId: scorerModel.id,
        },
      });
      // Add a small delay to avoid rate limits if necessary
      // await new Promise(resolve => setTimeout(resolve, 200));
    } // End response loop

    console.log(`LLM Scoring completed for EvalRun ${evalRunId}`);
  } catch (error) {
    console.error(
      `Critical error during LLM scoring for EvalRun ${evalRunId}:`,
      error
    );
    // How to report this back? Maybe update EvalRun status or add a log entry?
  }
};

export const triggerLlmScoring = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { evalRunId, scorerModelId, scoringPrompt } =
    req.body as TriggerLlmScoringInput;

  if (!evalRunId || !scorerModelId || !scoringPrompt) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "Missing required fields: evalRunId, scorerModelId, scoringPrompt.",
      },
    });
  }

  // Respond immediately (202 Accepted) as scoring runs in the background
  res.status(202).json({
    success: true,
    message: `LLM scoring initiated for run ${evalRunId}.`,
  });

  // Start async scoring process (don't await)
  runLlmScoring(evalRunId, scorerModelId, scoringPrompt);
};
