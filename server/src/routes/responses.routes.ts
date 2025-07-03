import express from "express";
import { deleteResponse } from "../controllers/responseController";

const router = express.Router();

// Define the route for deleting a specific response
// DELETE /api/responses/:responseId
router.delete("/:responseId", deleteResponse);

// Add other response-specific routes here if needed in the future

export default router;
