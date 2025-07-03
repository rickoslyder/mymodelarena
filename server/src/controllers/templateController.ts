import { Request, Response, NextFunction } from "express";
import prisma from "../db/prisma";
import { Prisma } from "@prisma/client";

interface CreateTemplateInput {
  name: string;
  description: string;
  category: string;
  icon?: string;
  prompt: string;
  isPublic?: boolean;
  defaultQuestionTypes: string[];
  defaultDifficulty: "easy" | "medium" | "hard" | "expert";
  defaultFormat: "open-ended" | "multiple-choice" | "true-false" | "code-completion";
  defaultCount: number;
  tags: string[];
  examples: string[];
}

interface UpdateTemplateInput {
  name?: string;
  description?: string;
  category?: string;
  icon?: string;
  prompt?: string;
  isPublic?: boolean;
  defaultQuestionTypes?: string[];
  defaultDifficulty?: "easy" | "medium" | "hard" | "expert";
  defaultFormat?: "open-ended" | "multiple-choice" | "true-false" | "code-completion";
  defaultCount?: number;
  tags?: string[];
  examples?: string[];
}

// Helper function to serialize/deserialize arrays
const serializeArrayField = (arr: string[]): string => JSON.stringify(arr);
const deserializeArrayField = (str: string): string[] => {
  try {
    return JSON.parse(str) || [];
  } catch {
    return [];
  }
};

// Transform template for API response
const transformTemplate = (template: any) => ({
  ...template,
  defaultQuestionTypes: deserializeArrayField(template.defaultQuestionTypes),
  tags: deserializeArrayField(template.tags),
  examples: deserializeArrayField(template.examples),
});

/**
 * Get all templates with optional filtering
 */
export const getAllTemplates = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const {
      category,
      isPublic,
      isBuiltIn,
      search,
      tags,
      limit,
      offset
    } = req.query;

    const where: Prisma.EvalTemplateWhereInput = {};

    // Apply filters
    if (category) {
      where.category = category as string;
    }
    if (isPublic !== undefined) {
      where.isPublic = isPublic === 'true';
    }
    if (isBuiltIn !== undefined) {
      where.isBuiltIn = isBuiltIn === 'true';
    }
    if (search) {
      where.OR = [
        { name: { contains: search as string } },
        { description: { contains: search as string } },
      ];
    }

    // Note: Tag filtering would require complex JSON queries, implemented later

    const templates = await prisma.evalTemplate.findMany({
      where,
      orderBy: [
        { isBuiltIn: 'desc' }, // Built-in templates first
        { usageCount: 'desc' }, // Then by popularity
        { createdAt: 'desc' }
      ],
      take: limit ? parseInt(limit as string) : undefined,
      skip: offset ? parseInt(offset as string) : undefined,
      include: {
        templateTags: {
          include: {
            tag: true
          }
        }
      }
    });

    const transformedTemplates = templates.map(transformTemplate);

    res.status(200).json({
      success: true,
      data: transformedTemplates,
      meta: {
        total: templates.length
      }
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get template by ID
 */
export const getTemplateById = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const template = await prisma.evalTemplate.findUnique({
      where: { id },
      include: {
        templateTags: {
          include: {
            tag: true
          }
        }
      }
    });

    if (!template) {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID ${id} not found.` }
      });
    }

    res.status(200).json({
      success: true,
      data: transformTemplate(template)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Create new template
 */
export const createTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const templateData = req.body as CreateTemplateInput;

  try {
    // Validate required fields
    if (!templateData.name || !templateData.description || !templateData.category || !templateData.prompt) {
      return res.status(400).json({
        success: false,
        error: { message: "Missing required fields: name, description, category, and prompt are required." }
      });
    }

    const template = await prisma.evalTemplate.create({
      data: {
        name: templateData.name,
        description: templateData.description,
        category: templateData.category,
        icon: templateData.icon,
        prompt: templateData.prompt,
        isPublic: templateData.isPublic || false,
        defaultQuestionTypes: serializeArrayField(templateData.defaultQuestionTypes || []),
        defaultDifficulty: templateData.defaultDifficulty || "medium",
        defaultFormat: templateData.defaultFormat || "open-ended",
        defaultCount: templateData.defaultCount || 10,
        tags: serializeArrayField(templateData.tags || []),
        examples: serializeArrayField(templateData.examples || []),
        // createdByUserId would be set from authentication when implemented
      }
    });

    res.status(201).json({
      success: true,
      data: transformTemplate(template)
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Update template
 */
export const updateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const updates = req.body as UpdateTemplateInput;

  try {
    const updateData: Prisma.EvalTemplateUpdateInput = {};

    // Only update provided fields
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.description !== undefined) updateData.description = updates.description;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.icon !== undefined) updateData.icon = updates.icon;
    if (updates.prompt !== undefined) updateData.prompt = updates.prompt;
    if (updates.isPublic !== undefined) updateData.isPublic = updates.isPublic;
    if (updates.defaultQuestionTypes !== undefined) {
      updateData.defaultQuestionTypes = serializeArrayField(updates.defaultQuestionTypes);
    }
    if (updates.defaultDifficulty !== undefined) updateData.defaultDifficulty = updates.defaultDifficulty;
    if (updates.defaultFormat !== undefined) updateData.defaultFormat = updates.defaultFormat;
    if (updates.defaultCount !== undefined) updateData.defaultCount = updates.defaultCount;
    if (updates.tags !== undefined) updateData.tags = serializeArrayField(updates.tags);
    if (updates.examples !== undefined) updateData.examples = serializeArrayField(updates.examples);

    const template = await prisma.evalTemplate.update({
      where: { id },
      data: updateData
    });

    res.status(200).json({
      success: true,
      data: transformTemplate(template)
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID ${id} not found.` }
      });
    }
    next(error);
  }
};

/**
 * Delete template
 */
export const deleteTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    await prisma.evalTemplate.delete({
      where: { id }
    });

    res.status(204).send();
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID ${id} not found.` }
      });
    }
    next(error);
  }
};

/**
 * Increment template usage count
 */
export const incrementTemplateUsage = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;

  try {
    const template = await prisma.evalTemplate.update({
      where: { id },
      data: {
        usageCount: {
          increment: 1
        }
      }
    });

    res.status(200).json({
      success: true,
      data: { usageCount: template.usageCount }
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID ${id} not found.` }
      });
    }
    next(error);
  }
};

/**
 * Get template categories
 */
export const getTemplateCategories = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  try {
    const categories = await prisma.evalTemplate.groupBy({
      by: ['category'],
      _count: {
        category: true
      },
      where: {
        OR: [
          { isPublic: true },
          { isBuiltIn: true }
        ]
      }
    });

    const formattedCategories = categories.map(cat => ({
      name: cat.category,
      count: cat._count.category
    }));

    res.status(200).json({
      success: true,
      data: formattedCategories
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Duplicate template (create copy)
 */
export const duplicateTemplate = async (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  const { id } = req.params;
  const { name } = req.body;

  try {
    // Get original template
    const original = await prisma.evalTemplate.findUnique({
      where: { id }
    });

    if (!original) {
      return res.status(404).json({
        success: false,
        error: { message: `Template with ID ${id} not found.` }
      });
    }

    // Create copy
    const duplicate = await prisma.evalTemplate.create({
      data: {
        name: name || `${original.name} (Copy)`,
        description: original.description,
        category: original.category,
        icon: original.icon,
        prompt: original.prompt,
        isPublic: false, // Copies are private by default
        defaultQuestionTypes: original.defaultQuestionTypes,
        defaultDifficulty: original.defaultDifficulty,
        defaultFormat: original.defaultFormat,
        defaultCount: original.defaultCount,
        tags: original.tags,
        examples: original.examples,
        // createdByUserId would be set from authentication
      }
    });

    res.status(201).json({
      success: true,
      data: transformTemplate(duplicate)
    });
  } catch (error) {
    next(error);
  }
};