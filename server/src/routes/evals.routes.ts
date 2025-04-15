import { Router } from "express";
import * as evalController from "../controllers/evalController"; // Import eval controller
import * as questionController from "../controllers/questionController"; // Import question controller
import * as tagController from "../controllers/tagController"; // Import tag controller
import * as judgmentController from "../controllers/judgmentController"; // Import judgment controller

const router = Router();

// Define routes for evals here
router.post("/generate", evalController.generateEvalSet);
router.get("/", evalController.getAllEvals);
router.get("/:id", evalController.getEvalById);
router.put("/:id", evalController.updateEval);
router.delete("/:id", evalController.deleteEval);

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
router.put("/:id/tags", tagController.updateEvalTags); // Route to update tags for a specific eval

// --- Nested Judgment Route ---
router.get("/:id/judgments", judgmentController.getJudgmentsForEval); // Get judgments for a specific eval

export default router;
