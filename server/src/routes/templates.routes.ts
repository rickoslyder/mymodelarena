import express from "express";
import {
  getAllTemplates,
  getTemplateById,
  createTemplate,
  updateTemplate,
  deleteTemplate,
  incrementTemplateUsage,
  getTemplateCategories,
  duplicateTemplate,
} from "../controllers/templateController";

const router = express.Router();

// Template CRUD routes
router.get("/", getAllTemplates);
router.get("/categories", getTemplateCategories);
router.get("/:id", getTemplateById);
router.post("/", createTemplate);
router.put("/:id", updateTemplate);
router.delete("/:id", deleteTemplate);

// Template actions
router.post("/:id/use", incrementTemplateUsage);
router.post("/:id/duplicate", duplicateTemplate);

export default router;