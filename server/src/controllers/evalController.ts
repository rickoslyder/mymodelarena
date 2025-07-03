import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import LlmService from "../services/llmService";
import { PromptEngineering } from "../services/promptEngineering";
import { Prisma } from "@prisma/client"; // Import Prisma namespace

interface GenerateEvalInput {
  generatorModelIds: string[]; // Support multiple models
  userPrompt?: string;
  templateId?: string; // Optional template to use
  numQuestions: number;
  // Structured options
  questionTypes?: string[];
  difficulty?: string;
  format?: string;
  evalName?: string; // Optional name for the eval set
  evalDescription?: string; // Optional description
  // Generation mode
  mode?: 'guided' | 'advanced';
}

interface GenerateEvalSetInput {
  generatorModelId: string;
  prompt: string;
  numQuestions?: number;
  templateId?: string;
  questionTypes?: string[];
  difficulty?: string;
  format?: string;
}

// Helper function to build enhanced prompt based on template and options
const buildEnhancedPrompt = async (
  templateId?: string,
  userPrompt?: string,
  questionTypes?: string[],
  difficulty?: string,
  format?: string,
  numQuestions?: number
): Promise<string> => {
  let basePrompt = '';
  
  // Use template if provided
  if (templateId) {
    const template = await prisma.evalTemplate.findUnique({
      where: { id: templateId }
    });
    
    if (template) {
      basePrompt = template.prompt;
      // Increment usage count
      await prisma.evalTemplate.update({
        where: { id: templateId },
        data: { usageCount: { increment: 1 } }
      });
    }
  }
  
  // Use user prompt if no template or as override
  if (userPrompt) {
    basePrompt = userPrompt;
  }
  
  // Enhance with structured options
  let enhancedPrompt = basePrompt;
  
  if (questionTypes && questionTypes.length > 0) {
    enhancedPrompt += `\n\nFocus on these question types: ${questionTypes.join(', ')}`;
  }
  
  if (difficulty) {
    enhancedPrompt += `\n\nDifficulty level: ${difficulty}`;
  }
  
  if (format) {
    enhancedPrompt += `\n\nQuestion format: ${format}`;
  }
  
  return enhancedPrompt;
};

// Helper function to parse LLM response
const parseGeneratedQuestions = (responseText: string): string[] => {
  try {
    const parsedJson = JSON.parse(responseText);
    // Explicitly check if parsedJson has a 'questions' property which is an array of strings
    if (
      parsedJson &&
      Array.isArray(parsedJson.questions) &&
      parsedJson.questions.every((q: any) => typeof q === "string")
    ) {
      return parsedJson.questions;
    } else {
      console.error(
        "Parsed JSON does not match expected format { questions: string[] }:",
        parsedJson
      );
      throw new Error(
        "LLM response did not contain a valid 'questions' array."
      );
    }
  } catch (error: any) {
    console.error("Failed to parse LLM response as JSON:", responseText, error);
    // Fallback attempt: Try splitting by newline if JSON fails and it looks like a list
    if (typeof responseText === "string" && responseText.includes("\n")) {
      console.warn("Falling back to newline splitting for question parsing.");
      return responseText
        .split("\n")
        .map((q) => q.trim())
        .filter((q) => q && !/^\d+\.\s*/.test(q)); // Basic cleaning
    }
    throw new Error(
      `Failed to parse questions from LLM response: ${error.message}`
    );
  }
};

// Enhanced eval generation endpoint with template and multi-model support
export const generateEvalSetEnhanced = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    generatorModelIds,
    userPrompt,
    templateId,
    numQuestions = 10,
    questionTypes,
    difficulty,
    format,
    evalName,
    evalDescription,
    mode = 'guided'
  } = req.body as GenerateEvalInput;

  // Validation
  if (!generatorModelIds || !Array.isArray(generatorModelIds) || generatorModelIds.length === 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "At least one generatorModelId is required.",
      },
    });
  }

  if (!templateId && !userPrompt) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Either templateId or userPrompt is required.",
      },
    });
  }

  try {
    // Build enhanced prompt
    const enhancedPrompt = await buildEnhancedPrompt(
      templateId,
      userPrompt,
      questionTypes,
      difficulty,
      format,
      numQuestions
    );

    // Use the first model for generation (for now, later we can implement consensus or best-of-N)
    const primaryModelId = generatorModelIds[0];
    const generatorModel = await prisma.model.findUnique({
      where: { id: primaryModelId },
    });

    if (!generatorModel) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Generator model with ID ${primaryModelId} not found.`,
        },
      });
    }

    // Get template for enhanced prompting
    const template = templateId ? await prisma.evalTemplate.findUnique({
      where: { id: templateId }
    }) : null;

    // --- Construct Enhanced System Prompt using PromptEngineering service ---
    const systemPrompt = PromptEngineering.buildSystemPrompt(numQuestions, {
      questionTypes,
      difficulty,
      format,
      numQuestions
    });

    const enhancedUserPrompt = PromptEngineering.enhanceUserPrompt(
      enhancedPrompt,
      { questionTypes, difficulty, format, numQuestions },
      template || undefined
    );

    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${enhancedUserPrompt}\n\nOutput JSON ({ questions: string[] }):`;

    console.log(
      `Generating enhanced eval set with prompt for model ${generatorModel.name}`
    );
    
    // Call LlmService, explicitly requesting JSON output
    const completionResult = await LlmService.getLLMCompletion(
      generatorModel,
      fullPrompt,
      { max_tokens: 2048 },
      true // Force JSON output
    );

    if (completionResult.error || !completionResult.responseText) {
      throw new Error(
        completionResult.error || "LLM failed to generate response."
      );
    }

    // Parse the response
    const rawQuestions = parseGeneratedQuestions(
      completionResult.responseText
    );

    if (!rawQuestions || rawQuestions.length === 0) {
      throw new Error(
        "Failed to parse any valid questions from the LLM response."
      );
    }

    // Validate and improve question quality
    const { valid: generatedQuestions, issues } = PromptEngineering.validateQuestions(
      rawQuestions,
      { questionTypes, difficulty, format, numQuestions }
    );

    if (generatedQuestions.length === 0) {
      throw new Error(
        `All generated questions failed validation. Issues: ${issues.join(', ')}`
      );
    }

    // Log quality issues for monitoring
    if (issues.length > 0) {
      console.warn(`Question quality issues for model ${generatorModel.name}:`, issues);
    }

    // Get quality improvement suggestions
    const qualitySuggestions = PromptEngineering.getQualityImprovements(generatedQuestions);
    if (qualitySuggestions.length > 0) {
      console.log(`Quality suggestions for future generations:`, qualitySuggestions);
    }

    // Save the new Eval and Questions with enhanced metadata
    const newEval = await prisma.eval.create({
      data: {
        name: evalName || `Generated Eval Set - ${new Date().toLocaleDateString()}`,
        description: evalDescription,
        generatorModelId: primaryModelId,
        generationPrompt: enhancedPrompt,
        templateId: templateId,
        questionTypes: questionTypes ? JSON.stringify(questionTypes) : null,
        generationFormat: format,
        difficulty: difficulty,
        questions: {
          create: generatedQuestions.map((qText) => ({ text: qText })),
        },
      },
      include: {
        questions: true,
        templateUsed: true,
      },
    });

    res.status(201).json({ success: true, data: newEval });
  } catch (error) {
    next(error);
  }
};

export const generateEvalSet = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const {
    generatorModelId,
    prompt,
    numQuestions = 10,
  } = req.body as GenerateEvalSetInput;

  if (!generatorModelId || !prompt) {
    return res.status(400).json({
      success: false,
      error: {
        message: "Missing required fields: generatorModelId and prompt.",
      },
    });
  }

  try {
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

    // --- Construct Enhanced Prompt ---
    const systemPrompt = `You are an expert assistant tasked with generating a set of challenging evaluation questions for Large Language Models based on the user's request. 
    You MUST output ONLY a single, valid JSON object. This JSON object MUST contain a single key named "questions". 
    The value of the "questions" key MUST be a JSON array of strings, where each string is a unique evaluation question.
    Generate exactly ${numQuestions} distinct questions. Do not include numbering in the question strings themselves.`;

    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${prompt}\n\nOutput JSON ({ questions: string[] }):`;

    console.log(
      `Generating eval set with prompt for model ${generatorModel.name}`
    );
    // Call LlmService, explicitly requesting JSON output
    const completionResult = await LlmService.getLLMCompletion(
      generatorModel,
      fullPrompt,
      { max_tokens: 2048 }, // Increase max tokens potentially needed for JSON array
      true // Force JSON output
    );

    if (completionResult.error || !completionResult.responseText) {
      throw new Error(
        completionResult.error || "LLM failed to generate response."
      );
    }

    // Parse the response
    const generatedQuestions = parseGeneratedQuestions(
      completionResult.responseText
    );

    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error(
        "Failed to parse any valid questions from the LLM response."
      );
    }

    // Save the new Eval and Questions
    const newEval = await prisma.eval.create({
      data: {
        generatorModelId: generatorModelId,
        generationPrompt: prompt,
        // name: `Eval Generated by ${generatorModel.name} on ${new Date().toLocaleDateString()}`, // Optional default name
        questions: {
          create: generatedQuestions.map((qText) => ({ text: qText })),
        },
      },
      include: {
        questions: true, // Include questions in the response
      },
    });

    res.status(201).json({ success: true, data: newEval });
  } catch (error) {
    next(error);
  }
};

export const getAllEvals = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Basic implementation - enhance with search/filter/pagination later
  try {
    const evals = await prisma.eval.findMany({
      orderBy: { createdAt: "desc" },
      include: {
        _count: { select: { questions: true } }, // Include question count
        tags: { include: { tag: true } }, // Include tags
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
    const evalData = await prisma.eval.findUnique({
      where: { id },
      include: {
        questions: { orderBy: { createdAt: "asc" } },
        tags: { include: { tag: true } }, // Include tags
        // Include generator model later if needed
      },
    });
    if (!evalData) {
      return res.status(404).json({
        success: false,
        error: { message: `Eval with ID ${id} not found.` },
      });
    }
    res.status(200).json({ success: true, data: evalData });
  } catch (error) {
    next(error);
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
  // Only allow updating certain fields (e.g., name, description, difficulty)
  const { name, description, difficulty } = req.body;

  try {
    const updatedEval = await prisma.eval.update({
      where: { id },
      data: {
        name,
        description,
        difficulty,
      },
    });
    res.status(200).json({ success: true, data: updatedEval });
  } catch (error) {
    // Handle potential Prisma errors (e.g., P2025 Record not found)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        success: false,
        error: { message: `Eval with ID ${id} not found.` },
      });
    }
    next(error);
  }
};

export const deleteEval = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  try {
    // Need to delete related records first due to foreign key constraints
    // Order: Score -> Judgment -> Response -> EvalRun -> Question -> EvalTag -> Eval

    // This simple delete will fail if related records exist.
    // A transaction is needed for robust deletion.
    // await prisma.eval.delete({ where: { id } });

    // --- Transactional Delete ---
    // Fetch related IDs first
    const evalToDelete = await prisma.eval.findUnique({
      where: { id },
      include: {
        questions: { select: { id: true } },
        evalRuns: { select: { id: true } },
      },
    });

    if (!evalToDelete) {
      return res.status(404).json({
        success: false,
        error: { message: `Eval with ID ${id} not found.` },
      });
    }

    const questionIds = evalToDelete.questions.map((q) => q.id);
    const evalRunIds = evalToDelete.evalRuns.map((run) => run.id);

    // Find responses related to these questions/runs
    const responseIds = await prisma.response
      .findMany({
        where: {
          OR: [
            { questionId: { in: questionIds } },
            { evalRunId: { in: evalRunIds } },
          ],
        },
        select: { id: true },
      })
      .then((responses) => responses.map((r) => r.id));

    await prisma.$transaction([
      // Delete Scores related to responses
      prisma.score.deleteMany({ where: { responseId: { in: responseIds } } }),
      // Delete Judgments related to questions
      prisma.judgment.deleteMany({
        where: { questionId: { in: questionIds } },
      }),
      // Delete Responses
      prisma.response.deleteMany({ where: { id: { in: responseIds } } }),
      // Delete EvalRuns
      prisma.evalRun.deleteMany({ where: { id: { in: evalRunIds } } }),
      // Delete EvalTags
      prisma.evalTag.deleteMany({ where: { evalId: id } }),
      // Delete Questions
      prisma.question.deleteMany({ where: { id: { in: questionIds } } }),
      // Finally, delete the Eval itself
      prisma.eval.delete({ where: { id } }),
    ]);

    console.log(`Deleted Eval ${id} and associated records.`);
    res.status(204).send(); // No content
  } catch (error) {
    // Handle potential Prisma errors (e.g., P2025 Record not found during transaction)
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2025"
    ) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Eval with ID ${id} not found or already deleted.`,
        },
      });
    }
    console.error(`Error deleting Eval ${id}:`, error);
    next(error);
  }
};

// Interface for Regenerate request body
interface RegenerateEvalQuestionsInput {
  numQuestions: number;
}

// Interface for Add Questions request body
interface AddAdditionalEvalQuestionsInput {
  numQuestions: number;
}

/**
 * Regenerates questions for an existing evaluation, replacing the old ones.
 */
export const regenerateEvalQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalId } = req.params;
  const { numQuestions } = req.body as RegenerateEvalQuestionsInput;

  if (!numQuestions || numQuestions <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message: "A positive number of questions (numQuestions) is required.",
      },
    });
  }

  try {
    // 1. Fetch Eval details (prompt, generator model)
    const evalData = await prisma.eval.findUnique({
      where: { id: evalId },
      select: { generationPrompt: true, generatorModelId: true },
    });

    if (!evalData) {
      return res.status(404).json({
        success: false,
        error: { message: `Eval with ID ${evalId} not found.` },
      });
    }
    if (!evalData.generationPrompt || !evalData.generatorModelId) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Cannot regenerate questions: Original prompt or generator model missing.",
        },
      });
    }

    const generatorModel = await prisma.model.findUnique({
      where: { id: evalData.generatorModelId },
    });

    if (!generatorModel) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Original generator model with ID ${evalData.generatorModelId} not found.`,
        },
      });
    }

    // 2. Construct Prompt for LLM
    const systemPrompt = `You are an expert assistant tasked with generating a set of challenging evaluation questions for Large Language Models based on the user's request. 
        You MUST output ONLY a single, valid JSON object. This JSON object MUST contain a single key named "questions". 
        The value of the "questions" key MUST be a JSON array of strings, where each string is a unique evaluation question.
        Generate exactly ${numQuestions} distinct questions. Do not include numbering in the question strings themselves.`;
    const fullPrompt = `${systemPrompt}\n\nUser Request:\n${evalData.generationPrompt}\n\nOutput JSON ({ questions: string[] }):`;

    // 3. Call LlmService
    console.log(
      `Regenerating ${numQuestions} questions for Eval ${evalId} using model ${generatorModel.name}`
    );
    const completionResult = await LlmService.getLLMCompletion(
      generatorModel,
      fullPrompt,
      { max_tokens: 2048 },
      true // Force JSON
    );

    if (completionResult.error || !completionResult.responseText) {
      throw new Error(
        completionResult.error ||
          "LLM failed to generate regeneration response."
      );
    }

    // 4. Parse Response
    const generatedQuestions = parseGeneratedQuestions(
      completionResult.responseText
    );
    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error(
        "Failed to parse any valid questions from the regeneration response."
      );
    }

    // 5. Use Transaction: Delete old questions, create new questions
    const updatedEval = await prisma.$transaction(async (tx) => {
      // Delete judgments/responses/scores associated with old questions first
      const oldQuestionIds = await tx.question
        .findMany({
          where: { evalId: evalId },
          select: { id: true },
        })
        .then((qs) => qs.map((q) => q.id));

      const oldResponseIds = await tx.response
        .findMany({
          where: { questionId: { in: oldQuestionIds } },
          select: { id: true },
        })
        .then((rs) => rs.map((r) => r.id));

      await tx.score.deleteMany({
        where: { responseId: { in: oldResponseIds } },
      });
      await tx.judgment.deleteMany({
        where: { questionId: { in: oldQuestionIds } },
      });
      await tx.response.deleteMany({ where: { id: { in: oldResponseIds } } });

      // Delete old questions
      await tx.question.deleteMany({ where: { evalId: evalId } });

      // Create new questions and link them by updating the eval
      const updateEval = await tx.eval.update({
        where: { id: evalId },
        data: {
          questions: {
            create: generatedQuestions.map((qText) => ({ text: qText })),
          },
        },
        include: { questions: true }, // Include new questions in response
      });
      return updateEval;
    });

    res.status(200).json({ success: true, data: updatedEval });
  } catch (error) {
    next(error);
  }
};

/**
 * Generates additional questions for an existing evaluation.
 */
export const generateAdditionalEvalQuestions = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id: evalId } = req.params;
  const { numQuestions } = req.body as AddAdditionalEvalQuestionsInput;

  if (!numQuestions || numQuestions <= 0) {
    return res.status(400).json({
      success: false,
      error: {
        message:
          "A positive number of additional questions (numQuestions) is required.",
      },
    });
  }

  try {
    // 1. Fetch Eval details (prompt, generator model)
    const evalData = await prisma.eval.findUnique({
      where: { id: evalId },
      select: { generationPrompt: true, generatorModelId: true },
    });

    if (!evalData) {
      return res.status(404).json({
        success: false,
        error: { message: `Eval with ID ${evalId} not found.` },
      });
    }
    if (!evalData.generationPrompt || !evalData.generatorModelId) {
      return res.status(400).json({
        success: false,
        error: {
          message:
            "Cannot generate additional questions: Original prompt or generator model missing.",
        },
      });
    }

    const generatorModel = await prisma.model.findUnique({
      where: { id: evalData.generatorModelId },
    });

    if (!generatorModel) {
      return res.status(404).json({
        success: false,
        error: {
          message: `Original generator model with ID ${evalData.generatorModelId} not found.`,
        },
      });
    }

    // 2. Construct Prompt for LLM
    // Similar prompt, just asking for NEW questions
    const systemPrompt = `You are an expert assistant tasked with generating additional challenging evaluation questions for Large Language Models based on the user's request. 
        These questions should be distinct from any previously generated ones for the same request.
        You MUST output ONLY a single, valid JSON object. This JSON object MUST contain a single key named "questions". 
        The value of the "questions" key MUST be a JSON array of strings, where each string is a unique evaluation question.
        Generate exactly ${numQuestions} new distinct questions. Do not include numbering in the question strings themselves.`;
    const fullPrompt = `${systemPrompt}\n\nOriginal User Request:\n${evalData.generationPrompt}\n\nOutput JSON ({ questions: string[] }):`;

    // 3. Call LlmService
    console.log(
      `Generating ${numQuestions} additional questions for Eval ${evalId} using model ${generatorModel.name}`
    );
    const completionResult = await LlmService.getLLMCompletion(
      generatorModel,
      fullPrompt,
      { max_tokens: 2048 },
      true // Force JSON
    );

    if (completionResult.error || !completionResult.responseText) {
      throw new Error(
        completionResult.error ||
          "LLM failed to generate additional questions response."
      );
    }

    // 4. Parse Response
    const generatedQuestions = parseGeneratedQuestions(
      completionResult.responseText
    );
    if (!generatedQuestions || generatedQuestions.length === 0) {
      throw new Error(
        "Failed to parse any valid additional questions from the LLM response."
      );
    }

    // 5. Add new questions to the existing Eval
    const updatedEval = await prisma.eval.update({
      where: { id: evalId },
      data: {
        questions: {
          create: generatedQuestions.map((qText) => ({ text: qText })),
        },
      },
      include: { questions: true }, // Include all questions in response
    });

    res.status(200).json({ success: true, data: updatedEval });
  } catch (error) {
    next(error);
  }
};
