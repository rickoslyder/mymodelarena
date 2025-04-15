import { Router } from "express";
import * as reportController from "../controllers/reportController";

const router = Router();

// Define routes for reports
router.get("/leaderboard", reportController.getLeaderboardData);
router.get("/costs", reportController.getCostReportData);

// Add more report endpoints later if needed

export default router;
