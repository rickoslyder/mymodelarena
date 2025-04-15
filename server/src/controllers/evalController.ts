import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService";

interface GenerateEvalInput {
  generatorModelId: string;
  userPrompt: string;
  numQuestions: number;
  // Add structured options later if needed
  // typeTags?: string[];
  // topic?: string;
  // difficulty?: string;
  evalName?: string; // Optional name for the eval set
  evalDescription?: string; // Optional description
}

export const generateEvalSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    generatorModelId,
    userPrompt,
    numQuestions = 10, // Default to 10 questions
    evalName,
    evalDescription,
    // Structured options placeholder
  } = req.body as GenerateEvalInput;

  if (!generatorModelId || !userPrompt) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Missing required fields: generatorModelId, userPrompt",
      },
    });
  }

  try {
    // 1. Fetch the generator model configuration
    const generatorModel = await prisma.model.findUnique({
      where: { id: generatorModelId },
    });

    if (!generatorModel) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Generator model with ID ${generatorModelId} not found.`,
        },
      });
    }

    // 2. Construct the final prompt for the LLM
    // TODO: Incorporate structured options (difficulty, topic, types) more effectively
    const finalPrompt = `Generate ${numQuestions} unique evaluation questions based on the following user instructions:\n\n---\n${userPrompt}\n---\n
Output each question on a new line, numbered. Do not include any other text or preamble.`;

    // 3. Call the LlmService
    console.log(
      `Requesting eval generation from model: ${generatorModel.name}`
    );
    const result = await LlmService.getLLMCompletion(
      generatorModel,
      finalPrompt,
      { max_tokens: 2048 },
      true
    );

    if (result.error || !result.responseText) {
      console.error(
        `Eval generation failed for model ${generatorModel.name}:`,
        result.error
      );
      return res.status(500).json({
        success: false,
        error: {
          message: `Failed to generate eval questions: ${
            result.error || "No response text received."
          }`,
        },
      });
    }

    // 4. Parse the response text into questions
    const generatedQuestions = result.responseText
      .split("\n") // Split by newline
      .map((line) => line.trim())
      .filter((line) => line.length > 0) // Remove empty lines
      .map((line) => line.replace(/^\d+[\.\)]\s*/, "")) // Remove leading numbers/dots/spaces
      .filter((line) => line.length > 5); // Basic filter for very short/invalid lines

    if (generatedQuestions.length === 0) {
      console.error(
        `Could not parse any valid questions from LLM response:`,
        result.responseText
      );
      return res.status(500).json({
        success: false,
        error: {
          message: "Could not parse any valid questions from the LLM response.",
        },
      });
    }

    console.log(
      `Successfully generated ${generatedQuestions.length} questions.`
    );

    // 5. Save the new Eval and Questions to the database
    const newEval = await prisma.eval.create({
      data: {
        name: evalName || `Generated Eval ${new Date().toISOString()}`, // Default name
        description: evalDescription,
        generationPrompt: userPrompt, // Store the original user prompt
        generatorModelId: generatorModel.id,
        // Store structured options later
        questions: {
          create: generatedQuestions.map((text) => ({ text: text })),
        },
      },
      include: {
        questions: true, // Include created questions in the response
      },
    });

    res.status(201).json({ success: true, data: newEval });
  } catch (error) {
    console.error("Error during eval generation process:", error);
    next(error); // Pass to global error handler
  }
};

export const getAllEvals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // TODO: Add filtering by name/tags from req.query
  try {
    const evals = await prisma.eval.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        // Optionally include tags or question count here
        // _count: { select: { questions: true } }
      },
    });
    res.status(200).json({ success: true, data: evals });
  } catch (error) {
    next(error);
  }
};

export const getEvalById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    const evalData = await prisma.eval.findUniqueOrThrow({
      where: { id },
      include: {
        questions: {
          // Include questions for detail view
          orderBy: { createdAt: "asc" },
        },
        // Include tags later
      },
    });
    res.status(200).json({ success: true, data: evalData });
  } catch (error) {
    next(error); // Handles P2025
  }
};

interface UpdateEvalInput {
  name?: string;
  description?: string;
  difficulty?: string;
  // Add tags later
}

export const updateEval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name, description, difficulty } = req.body as UpdateEvalInput;

  if (
    name === undefined &&
    description === undefined &&
    difficulty === undefined
  ) {
    return res.status(400).json({
      success: false,
      error: { message: "No update fields provided." },
    });
  }

  try {
    const updatedEval = await prisma.eval.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(description !== undefined && { description }),
        ...(difficulty !== undefined && { difficulty }),
        updatedAt: new Date(),
      },
    });
    res.status(200).json({ success: true, data: updatedEval });
  } catch (error) {
    next(error); // Handles P2025
  }
};

export const deleteEval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    // Prisma Cascade delete will handle related Questions, EvalTags, EvalRuns, etc.
    await prisma.eval.delete({ where: { id } });
    res.status(204).send();
  } catch (error) {
    next(error); // Handles P2025
  }
};
