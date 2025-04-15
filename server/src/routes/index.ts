import { Router } from "express";

// Import feature routers
import modelsRouter from "./models.routes";
import evalsRouter from "./evals.routes";
import tagsRouter from "./tags.routes";
import evalRunsRouter from "./evalRuns.routes";
import scoresRouter from "./scores.routes";
import judgmentsRouter from "./judgments.routes";
import reportsRouter from "./reports.routes";
import providersRouter from "./providers.routes";
// import reportsRouter from './reports.routes';

const router = Router();

// Mount feature routers
router.use("/models", modelsRouter);
router.use("/evals", evalsRouter);
router.use("/tags", tagsRouter);
router.use("/eval-runs", evalRunsRouter);
router.use("/scores", scoresRouter);
router.use("/judgments", judgmentsRouter);
router.use("/reports", reportsRouter);
router.use("/providers", providersRouter);
// router.use('/reports', reportsRouter);

export default router;
