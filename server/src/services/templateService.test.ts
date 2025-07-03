import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateService } from "./templateService";

// Mock Prisma client with factory function
vi.mock("../db/prisma", () => ({
  default: {
    evalTemplate: {
      findMany: vi.fn(),
      findUnique: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

describe.skip("TemplateService", () => {
  let mockPrisma: any;
  
  beforeEach(async () => {
    vi.resetAllMocks();
    mockPrisma = (await import("../db/prisma")).default;
  });

  describe("getAllTemplates", () => {
    it("should return all evalTemplates successfully", async () => {
      const mockTemplates = [
        {
          id: "1",
          name: "Math Template",
          description: "Template for math questions",
          category: "mathematics",
          icon: null,
          prompt: "Generate math questions about {{topic}}",
          isPublic: true,
          isBuiltIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultQuestionTypes: "[]",
          defaultDifficulty: "beginner",
          defaultFormat: "open-ended",
          defaultCount: 10,
          tags: '["math", "basic"]',
          examples: "[]",
          createdByUserId: null,
          usageCount: 0
        },
        {
          id: "2",
          name: "Science Template",
          description: "Template for science questions",
          category: "science",
          icon: null,
          prompt: "Create science questions about {{subject}} for {{level}} students",
          isPublic: true,
          isBuiltIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultQuestionTypes: "[]",
          defaultDifficulty: "intermediate",
          defaultFormat: "open-ended",
          defaultCount: 10,
          tags: '["science", "education"]',
          examples: "[]",
          createdByUserId: null,
          usageCount: 0
        }
      ];

      mockPrisma.evalTemplate.findMany.mockResolvedValue(mockTemplates);

      const result = await TemplateService.getAllTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.evalTemplate.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" }
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.evalTemplate.findMany.mockRejectedValue(dbError);

      await expect(TemplateService.getAllTemplates()).rejects.toThrow("Database connection failed");
    });
  });

  describe("getTemplateById", () => {
    it("should return evalTemplate by id successfully", async () => {
      const mockTemplate = {
        id: "1",
        name: "Test Template",
        description: "A test evalTemplate",
        category: "test",
        icon: null,
        prompt: "Test prompt with {{variable}}",
        isPublic: true,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultQuestionTypes: "[]",
        defaultDifficulty: "beginner",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: '["test"]',
        examples: "[]",
        createdByUserId: null,
        usageCount: 0
      };

      mockPrisma.evalTemplate.findUnique.mockResolvedValue(mockTemplate);

      const result = await TemplateService.getTemplateById("1");

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.evalTemplate.findUnique).toHaveBeenCalledWith({
        where: { id: "1" }
      });
    });

    it("should return null for non-existent evalTemplate", async () => {
      mockPrisma.evalTemplate.findUnique.mockResolvedValue(null);

      const result = await TemplateService.getTemplateById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createTemplate", () => {
    it("should create evalTemplate successfully", async () => {
      const evalTemplateData = {
        name: "New Template",
        description: "A new evalTemplate",
        category: "test",
        icon: null,
        prompt: "Create questions about {{topic}}",
        isPublic: true,
        isBuiltIn: false,
        defaultQuestionTypes: "[]",
        defaultDifficulty: "beginner",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: '["new", "test"]',
        examples: "[]",
        createdByUserId: null,
        usageCount: 0
      };

      const createdTemplate = {
        id: "new-id",
        ...evalTemplateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.evalTemplate.create.mockResolvedValue(createdTemplate);

      const result = await TemplateService.createTemplate(evalTemplateData);

      expect(result).toEqual(createdTemplate);
      expect(mockPrisma.evalTemplate.create).toHaveBeenCalledWith({
        data: evalTemplateData
      });
    });

    it("should handle validation errors", async () => {
      const invalidData = {
        name: "", // Invalid empty name
        description: "Test",
        category: "test",
        icon: null,
        prompt: "Test",
        isPublic: true,
        isBuiltIn: false,
        defaultQuestionTypes: "[]",
        defaultDifficulty: "invalid",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: "[]",
        examples: "[]",
        createdByUserId: null,
        usageCount: 0
      };

      const validationError = new Error("Validation failed");
      mockPrisma.evalTemplate.create.mockRejectedValue(validationError);

      await expect(TemplateService.createTemplate(invalidData)).rejects.toThrow("Validation failed");
    });
  });

  describe("updateTemplate", () => {
    it("should update evalTemplate successfully", async () => {
      const updateData = {
        name: "Updated Template",
        description: "Updated description",
        tags: '["updated"]'
      };

      const updatedTemplate = {
        id: "1",
        name: "Updated Template",
        description: "Updated description",
        category: "test",
        icon: null,
        prompt: "Original prompt",
        isPublic: true,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultQuestionTypes: "[]",
        defaultDifficulty: "beginner",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: '["updated"]',
        examples: "[]",
        createdByUserId: null,
        usageCount: 0
      };

      mockPrisma.evalTemplate.update.mockResolvedValue(updatedTemplate);

      const result = await TemplateService.updateTemplate("1", updateData);

      expect(result).toEqual(updatedTemplate);
      expect(mockPrisma.evalTemplate.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: updateData
      });
    });

    it("should handle non-existent evalTemplate update", async () => {
      const updateError = new Error("Template not found");
      mockPrisma.evalTemplate.update.mockRejectedValue(updateError);

      await expect(TemplateService.updateTemplate("non-existent", {})).rejects.toThrow("Template not found");
    });
  });

  describe("deleteTemplate", () => {
    it("should delete evalTemplate successfully", async () => {
      const deletedTemplate = {
        id: "1",
        name: "Deleted Template",
        description: "To be deleted",
        category: "test",
        icon: null,
        prompt: "Test",
        isPublic: true,
        isBuiltIn: true,
        createdAt: new Date(),
        updatedAt: new Date(),
        defaultQuestionTypes: "[]",
        defaultDifficulty: "beginner",
        defaultFormat: "open-ended",
        defaultCount: 10,
        tags: "[]",
        examples: "[]",
        createdByUserId: null,
        usageCount: 0
      };

      mockPrisma.evalTemplate.delete.mockResolvedValue(deletedTemplate);

      const result = await TemplateService.deleteTemplate("1");

      expect(result).toEqual(deletedTemplate);
      expect(mockPrisma.evalTemplate.delete).toHaveBeenCalledWith({
        where: { id: "1" }
      });
    });

    it("should handle non-existent evalTemplate deletion", async () => {
      const deleteError = new Error("Template not found");
      mockPrisma.evalTemplate.delete.mockRejectedValue(deleteError);

      await expect(TemplateService.deleteTemplate("non-existent")).rejects.toThrow("Template not found");
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should return evalTemplates filtered by category", async () => {
      const mathTemplates = [
        {
          id: "1",
          name: "Algebra Template",
          description: "Algebra questions",
          category: "mathematics",
          icon: null,
          prompt: "Generate algebra questions",
          isPublic: true,
          isBuiltIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultQuestionTypes: "[]",
          defaultDifficulty: "intermediate",
          defaultFormat: "open-ended",
          defaultCount: 10,
          tags: '["algebra"]',
          examples: "[]",
          createdByUserId: null,
          usageCount: 0
        }
      ];

      mockPrisma.evalTemplate.findMany.mockResolvedValue(mathTemplates);

      const result = await TemplateService.getTemplatesByCategory("mathematics");

      expect(result).toEqual(mathTemplates);
      expect(mockPrisma.evalTemplate.findMany).toHaveBeenCalledWith({
        where: { category: "mathematics" },
        orderBy: { createdAt: "desc" }
      });
    });
  });

  describe("getPublicTemplates", () => {
    it("should return only public evalTemplates", async () => {
      const publicTemplates = [
        {
          id: "1",
          name: "Public Template",
          description: "Public evalTemplate",
          category: "test",
          icon: null,
          prompt: "Public prompt",
          isPublic: true,
          isBuiltIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultQuestionTypes: "[]",
          defaultDifficulty: "beginner",
          defaultFormat: "open-ended",
          defaultCount: 10,
          tags: "[]",
          examples: "[]",
          createdByUserId: null,
          usageCount: 0
        }
      ];

      mockPrisma.evalTemplate.findMany.mockResolvedValue(publicTemplates);

      const result = await TemplateService.getPublicTemplates();

      expect(result).toEqual(publicTemplates);
      expect(mockPrisma.evalTemplate.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" }
      });
    });
  });

  describe("searchTemplates", () => {
    it("should search evalTemplates by name and description", async () => {
      const searchResults = [
        {
          id: "1",
          name: "Math Quiz Template",
          description: "Template for creating math quizzes",
          category: "mathematics",
          icon: null,
          prompt: "Create math quiz",
          isPublic: true,
          isBuiltIn: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          defaultQuestionTypes: "[]",
          defaultDifficulty: "beginner",
          defaultFormat: "open-ended",
          defaultCount: 10,
          tags: '["math", "quiz"]',
          examples: "[]",
          createdByUserId: null,
          usageCount: 0
        }
      ];

      mockPrisma.evalTemplate.findMany.mockResolvedValue(searchResults);

      const result = await TemplateService.searchTemplates("math");

      expect(result).toEqual(searchResults);
      expect(mockPrisma.evalTemplate.findMany).toHaveBeenCalledWith({
        where: {
          OR: [
            { name: { contains: "math", mode: "insensitive" } },
            { description: { contains: "math", mode: "insensitive" } },
            { tags: { has: "math" } }
          ]
        },
        orderBy: { createdAt: "desc" }
      });
    });

    it("should handle empty search query", async () => {
      mockPrisma.evalTemplate.findMany.mockResolvedValue([]);

      const result = await TemplateService.searchTemplates("");

      expect(result).toEqual([]);
    });
  });
});