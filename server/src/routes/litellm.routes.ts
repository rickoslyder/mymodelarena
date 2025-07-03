import { Router } from "express";
import * as litellmController from "../controllers/litellmController";

const router = Router();

// Get all available models from LiteLLM proxy
router.get("/models", litellmController.getAvailableModels);

// Get detailed info for a specific model
router.get("/models/:modelName", litellmController.getModelInfo);

// Test connection to LiteLLM proxy
router.post("/test-connection", litellmController.testConnection);

export default router;