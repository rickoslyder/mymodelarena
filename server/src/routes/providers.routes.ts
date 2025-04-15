import { Router } from "express";
import * as providerController from "../controllers/providerController";

const router = Router();

// Route to list models for a specific provider
router.get("/:provider/models", providerController.listProviderModels);

export default router;
