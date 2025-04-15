import { Router } from "express";
import * as tagController from "../controllers/tagController";

const router = Router();

// Route for getting all tags
router.get("/", tagController.getAllTags);

// Route for creating a new tag
router.post("/", tagController.createTag);

// Note: Updating eval tags is handled under the /evals route
// PUT /api/evals/:id/tags -> tagController.updateEvalTags

export default router;
