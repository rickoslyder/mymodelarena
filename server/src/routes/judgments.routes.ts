import express from "express";
import {
  triggerJudging,
  // getJudgmentsForEval is handled in evals.routes.ts
  deleteJudgment, // Import the new controller function
} from "../controllers/judgmentController";

const router = express.Router();

// POST /api/judgments -> Trigger judging for an eval
router.post("/", triggerJudging);

// DELETE /api/judgments/:judgmentId -> Delete a specific judgment
router.delete("/:judgmentId", deleteJudgment);

// Note: GET /api/evals/:id/judgments is defined in evals.routes.ts

export default router;
