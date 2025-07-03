import express from "express";
import {
  generateEvalSet,
  generateEvalSetEnhanced,
  getAllEvals,
  getEvalById,
  updateEval,
  deleteEval,
  regenerateEvalQuestions,
  generateAdditionalEvalQuestions,
} from "../controllers/evalController";
import * as questionController from "../controllers/questionController";
import { updateEvalTags } from "../controllers/tagController";
import {
  triggerJudging,
  getJudgmentsForEval,
} from "../controllers/judgmentController";
import {
  createEvalRun,
  getEvalRunResults,
  getLatestEvalRunResults,
} from "../controllers/evalRunController";

const router = express.Router();

// Eval CRUD
router.post("/", generateEvalSet);
router.post("/enhanced", generateEvalSetEnhanced); // New enhanced generation endpoint
router.get("/", getAllEvals);
router.get("/:id", getEvalById);
router.put("/:id", updateEval);
router.delete("/:id", deleteEval);
router.post("/:id/regenerate", regenerateEvalQuestions);
router.post("/:id/add-questions", generateAdditionalEvalQuestions);

// Add other eval routes later (GET /, GET /:id, PUT /:id, DELETE /:id)
// Add question routes later (PUT /:evalId/questions/:questionId, etc.)
// Add tag routes later (PUT /:id/tags)

// --- Nested Question Routes ---
router.put("/:evalId/questions/:questionId", questionController.updateQuestion);
router.delete(
  "/:evalId/questions/:questionId",
  questionController.deleteQuestion
);

// --- Nested Tag Association Route ---
router.put("/:id/tags", updateEvalTags);

// --- Nested Judgment Route ---
router.get("/:id/judgments", getJudgmentsForEval);

// Evaluation Runs
router.post("/:id/runs", createEvalRun);
router.get("/runs/:id/results", getEvalRunResults);

// NEW: Route for latest run results for a specific eval
router.get("/:id/latest-run/results", getLatestEvalRunResults);

// Judge Mode Runs
router.post("/:id/judge", triggerJudging);

export default router;
