import { Router } from "express";
import * as judgmentController from "../controllers/judgmentController";

const router = Router();

// Define routes for judgments
router.post("/", judgmentController.triggerJudging);

// Add route for getting judgments later (e.g., GET /?evalId=... or nested under /evals)
// router.get('/', judgmentController.getJudgmentsForEval);

export default router;
