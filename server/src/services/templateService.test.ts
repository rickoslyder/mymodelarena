import { describe, it, expect, vi, beforeEach } from "vitest";
import { TemplateService } from "./templateService";

// Mock Prisma client
const mockPrisma = {
  template: {
    findMany: vi.fn(),
    findUnique: vi.fn(),
    create: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
};
vi.mock("../db/prisma", () => ({ default: mockPrisma }));

describe.skip("TemplateService", () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe("getAllTemplates", () => {
    it("should return all templates successfully", async () => {
      const mockTemplates = [
        {
          id: "1",
          name: "Math Template",
          description: "Template for math questions",
          category: "mathematics",
          difficulty: "beginner",
          promptTemplate: "Generate math questions about {{topic}}",
          variables: ["topic"],
          tags: ["math", "basic"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        },
        {
          id: "2",
          name: "Science Template",
          description: "Template for science questions",
          category: "science",
          difficulty: "intermediate",
          promptTemplate: "Create science questions about {{subject}} for {{level}} students",
          variables: ["subject", "level"],
          tags: ["science", "education"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.template.findMany.mockResolvedValue(mockTemplates);

      const result = await TemplateService.getAllTemplates();

      expect(result).toEqual(mockTemplates);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        orderBy: { createdAt: "desc" }
      });
    });

    it("should handle database errors", async () => {
      const dbError = new Error("Database connection failed");
      mockPrisma.template.findMany.mockRejectedValue(dbError);

      await expect(TemplateService.getAllTemplates()).rejects.toThrow("Database connection failed");
    });
  });

  describe("getTemplateById", () => {
    it("should return template by id successfully", async () => {
      const mockTemplate = {
        id: "1",
        name: "Test Template",
        description: "A test template",
        category: "test",
        difficulty: "beginner",
        promptTemplate: "Test prompt with {{variable}}",
        variables: ["variable"],
        tags: ["test"],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.template.findUnique.mockResolvedValue(mockTemplate);

      const result = await TemplateService.getTemplateById("1");

      expect(result).toEqual(mockTemplate);
      expect(mockPrisma.template.findUnique).toHaveBeenCalledWith({
        where: { id: "1" }
      });
    });

    it("should return null for non-existent template", async () => {
      mockPrisma.template.findUnique.mockResolvedValue(null);

      const result = await TemplateService.getTemplateById("non-existent");

      expect(result).toBeNull();
    });
  });

  describe("createTemplate", () => {
    it("should create template successfully", async () => {
      const templateData = {
        name: "New Template",
        description: "A new template",
        category: "test",
        difficulty: "beginner" as const,
        promptTemplate: "Create questions about {{topic}}",
        variables: ["topic"],
        tags: ["new", "test"],
        isPublic: true
      };

      const createdTemplate = {
        id: "new-id",
        ...templateData,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.template.create.mockResolvedValue(createdTemplate);

      const result = await TemplateService.createTemplate(templateData);

      expect(result).toEqual(createdTemplate);
      expect(mockPrisma.template.create).toHaveBeenCalledWith({
        data: templateData
      });
    });

    it("should handle validation errors", async () => {
      const invalidData = {
        name: "", // Invalid empty name
        description: "Test",
        category: "test",
        difficulty: "invalid" as any,
        promptTemplate: "Test",
        variables: [],
        tags: [],
        isPublic: true
      };

      const validationError = new Error("Validation failed");
      mockPrisma.template.create.mockRejectedValue(validationError);

      await expect(TemplateService.createTemplate(invalidData)).rejects.toThrow("Validation failed");
    });
  });

  describe("updateTemplate", () => {
    it("should update template successfully", async () => {
      const updateData = {
        name: "Updated Template",
        description: "Updated description",
        tags: ["updated"]
      };

      const updatedTemplate = {
        id: "1",
        name: "Updated Template",
        description: "Updated description",
        category: "test",
        difficulty: "beginner" as const,
        promptTemplate: "Original prompt",
        variables: ["var"],
        tags: ["updated"],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.template.update.mockResolvedValue(updatedTemplate);

      const result = await TemplateService.updateTemplate("1", updateData);

      expect(result).toEqual(updatedTemplate);
      expect(mockPrisma.template.update).toHaveBeenCalledWith({
        where: { id: "1" },
        data: updateData
      });
    });

    it("should handle non-existent template update", async () => {
      const updateError = new Error("Template not found");
      mockPrisma.template.update.mockRejectedValue(updateError);

      await expect(TemplateService.updateTemplate("non-existent", {})).rejects.toThrow("Template not found");
    });
  });

  describe("deleteTemplate", () => {
    it("should delete template successfully", async () => {
      const deletedTemplate = {
        id: "1",
        name: "Deleted Template",
        description: "To be deleted",
        category: "test",
        difficulty: "beginner" as const,
        promptTemplate: "Test",
        variables: [],
        tags: [],
        isPublic: true,
        createdAt: new Date(),
        updatedAt: new Date()
      };

      mockPrisma.template.delete.mockResolvedValue(deletedTemplate);

      const result = await TemplateService.deleteTemplate("1");

      expect(result).toEqual(deletedTemplate);
      expect(mockPrisma.template.delete).toHaveBeenCalledWith({
        where: { id: "1" }
      });
    });

    it("should handle non-existent template deletion", async () => {
      const deleteError = new Error("Template not found");
      mockPrisma.template.delete.mockRejectedValue(deleteError);

      await expect(TemplateService.deleteTemplate("non-existent")).rejects.toThrow("Template not found");
    });
  });

  describe("getTemplatesByCategory", () => {
    it("should return templates filtered by category", async () => {
      const mathTemplates = [
        {
          id: "1",
          name: "Algebra Template",
          category: "mathematics",
          difficulty: "intermediate" as const,
          promptTemplate: "Generate algebra questions",
          variables: [],
          tags: ["algebra"],
          isPublic: true,
          description: "Algebra questions",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.template.findMany.mockResolvedValue(mathTemplates);

      const result = await TemplateService.getTemplatesByCategory("mathematics");

      expect(result).toEqual(mathTemplates);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: { category: "mathematics" },
        orderBy: { createdAt: "desc" }
      });
    });
  });

  describe("getPublicTemplates", () => {
    it("should return only public templates", async () => {
      const publicTemplates = [
        {
          id: "1",
          name: "Public Template",
          isPublic: true,
          category: "test",
          difficulty: "beginner" as const,
          promptTemplate: "Public prompt",
          variables: [],
          tags: [],
          description: "Public template",
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.template.findMany.mockResolvedValue(publicTemplates);

      const result = await TemplateService.getPublicTemplates();

      expect(result).toEqual(publicTemplates);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
        where: { isPublic: true },
        orderBy: { createdAt: "desc" }
      });
    });
  });

  describe("searchTemplates", () => {
    it("should search templates by name and description", async () => {
      const searchResults = [
        {
          id: "1",
          name: "Math Quiz Template",
          description: "Template for creating math quizzes",
          category: "mathematics",
          difficulty: "beginner" as const,
          promptTemplate: "Create math quiz",
          variables: [],
          tags: ["math", "quiz"],
          isPublic: true,
          createdAt: new Date(),
          updatedAt: new Date()
        }
      ];

      mockPrisma.template.findMany.mockResolvedValue(searchResults);

      const result = await TemplateService.searchTemplates("math");

      expect(result).toEqual(searchResults);
      expect(mockPrisma.template.findMany).toHaveBeenCalledWith({
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
      mockPrisma.template.findMany.mockResolvedValue([]);

      const result = await TemplateService.searchTemplates("");

      expect(result).toEqual([]);
    });
  });
});