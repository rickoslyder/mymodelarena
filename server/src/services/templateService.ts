import prisma from "../db/prisma";
import { EvalTemplate } from "@prisma/client";

export interface TemplateSearchOptions {
  category?: string;
  isPublic?: boolean;
  isBuiltIn?: boolean;
  search?: string;
  tags?: string[];
  limit?: number;
  offset?: number;
}

export interface TemplateUsageStats {
  templateId: string;
  usageCount: number;
  lastUsed?: Date;
  averageRating?: number;
}

/**
 * Service for managing evaluation templates
 */
export class TemplateService {
  
  /**
   * Get popular templates based on usage
   */
  static async getPopularTemplates(limit: number = 10): Promise<EvalTemplate[]> {
    return await prisma.evalTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { isBuiltIn: true }
        ]
      },
      orderBy: {
        usageCount: 'desc'
      },
      take: limit
    });
  }

  /**
   * Get recently created templates
   */
  static async getRecentTemplates(limit: number = 10): Promise<EvalTemplate[]> {
    return await prisma.evalTemplate.findMany({
      where: {
        OR: [
          { isPublic: true },
          { isBuiltIn: true }
        ]
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: limit
    });
  }

  /**
   * Search templates with advanced filtering
   */
  static async searchTemplates(options: TemplateSearchOptions): Promise<{
    templates: EvalTemplate[];
    total: number;
  }> {
    const where: any = {};

    // Build where clause
    if (options.category) {
      where.category = options.category;
    }
    
    if (options.isPublic !== undefined) {
      where.isPublic = options.isPublic;
    }
    
    if (options.isBuiltIn !== undefined) {
      where.isBuiltIn = options.isBuiltIn;
    }

    if (options.search) {
      where.OR = [
        { name: { contains: options.search } },
        { description: { contains: options.search } },
      ];
    }

    // TODO: Implement tag filtering when needed
    // Note: This would require JSON queries or a separate tag relationship

    const [templates, total] = await prisma.$transaction([
      prisma.evalTemplate.findMany({
        where,
        orderBy: [
          { isBuiltIn: 'desc' },
          { usageCount: 'desc' },
          { createdAt: 'desc' }
        ],
        take: options.limit,
        skip: options.offset
      }),
      prisma.evalTemplate.count({ where })
    ]);

    return { templates, total };
  }

  /**
   * Get template usage statistics
   */
  static async getTemplateStats(templateId: string): Promise<TemplateUsageStats | null> {
    const template = await prisma.evalTemplate.findUnique({
      where: { id: templateId },
      select: {
        id: true,
        usageCount: true,
        updatedAt: true
      }
    });

    if (!template) {
      return null;
    }

    return {
      templateId: template.id,
      usageCount: template.usageCount,
      lastUsed: template.updatedAt
    };
  }

  /**
   * Get templates by category with counts
   */
  static async getTemplatesByCategory(): Promise<{
    category: string;
    count: number;
    templates: EvalTemplate[];
  }[]> {
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

    const result = await Promise.all(
      categories.map(async (cat) => {
        const templates = await prisma.evalTemplate.findMany({
          where: {
            category: cat.category,
            OR: [
              { isPublic: true },
              { isBuiltIn: true }
            ]
          },
          orderBy: {
            usageCount: 'desc'
          }
        });

        return {
          category: cat.category,
          count: cat._count.category,
          templates
        };
      })
    );

    return result;
  }

  /**
   * Recommend templates based on user activity (placeholder for future ML)
   */
  static async getRecommendedTemplates(
    userId?: string,
    limit: number = 5
  ): Promise<EvalTemplate[]> {
    // For now, just return popular templates
    // In the future, this could use ML to recommend based on:
    // - User's previous template usage
    // - Generated eval performance
    // - Similar user preferences
    
    return await this.getPopularTemplates(limit);
  }

  /**
   * Duplicate a template for customization
   */
  static async duplicateTemplate(
    templateId: string,
    customizations: {
      name?: string;
      description?: string;
      prompt?: string;
      isPublic?: boolean;
    },
    userId?: string
  ): Promise<EvalTemplate> {
    const original = await prisma.evalTemplate.findUniqueOrThrow({
      where: { id: templateId }
    });

    const duplicate = await prisma.evalTemplate.create({
      data: {
        name: customizations.name || `${original.name} (Copy)`,
        description: customizations.description || original.description,
        category: original.category,
        icon: original.icon,
        prompt: customizations.prompt || original.prompt,
        isPublic: customizations.isPublic || false,
        isBuiltIn: false, // Copies are never built-in
        defaultQuestionTypes: original.defaultQuestionTypes,
        defaultDifficulty: original.defaultDifficulty,
        defaultFormat: original.defaultFormat,
        defaultCount: original.defaultCount,
        tags: original.tags,
        examples: original.examples,
        createdByUserId: userId
      }
    });

    return duplicate;
  }

  /**
   * Update template with validation
   */
  static async updateTemplate(
    templateId: string,
    updates: Partial<EvalTemplate>,
    userId?: string
  ): Promise<EvalTemplate> {
    // Add validation logic here
    if (updates.prompt && updates.prompt.length < 10) {
      throw new Error('Template prompt must be at least 10 characters');
    }

    if (updates.name && updates.name.length < 3) {
      throw new Error('Template name must be at least 3 characters');
    }

    return await prisma.evalTemplate.update({
      where: { id: templateId },
      data: updates
    });
  }

  /**
   * Get template usage analytics
   */
  static async getUsageAnalytics(days: number = 30): Promise<{
    totalUsage: number;
    topTemplates: { template: EvalTemplate; usage: number }[];
    usageByCategory: { category: string; usage: number }[];
  }> {
    // This is a simplified version. In production, you'd want to track
    // actual usage events with timestamps
    
    const templates = await prisma.evalTemplate.findMany({
      where: {
        usageCount: { gt: 0 }
      },
      orderBy: {
        usageCount: 'desc'
      },
      take: 10
    });

    const categoryUsage = await prisma.evalTemplate.groupBy({
      by: ['category'],
      _sum: {
        usageCount: true
      },
      where: {
        usageCount: { gt: 0 }
      }
    });

    const totalUsage = templates.reduce((sum, t) => sum + t.usageCount, 0);

    return {
      totalUsage,
      topTemplates: templates.map(t => ({ template: t, usage: t.usageCount })),
      usageByCategory: categoryUsage.map(cat => ({
        category: cat.category,
        usage: cat._sum.usageCount || 0
      }))
    };
  }
}