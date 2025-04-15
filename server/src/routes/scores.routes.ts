import { Router } from "express";
import * as scoreController from "../controllers/scoreController";

const router = Router();

// Define routes for scores
router.post("/manual", scoreController.addManualScore);

// Add LLM scoring route later
router.post("/llm", scoreController.triggerLlmScoring);

export default router;
