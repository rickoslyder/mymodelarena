import { Router } from "express";
import * as evalRunController from "../controllers/evalRunController";

const router = Router();

// Define routes for eval runs here
router.post("/", evalRunController.createEvalRun);

// Add routes for getting status or results later
router.get('/:id/status', evalRunController.getEvalRunStatus);
router.get("/:id/results", evalRunController.getEvalRunResults);

export default router;
