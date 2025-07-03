import express from "express";

// Import feature routers
import modelsRouter from "./models.routes";
import evalsRouter from "./evals.routes";
import evalRunsRouter from "./evalRuns.routes";
import reportsRouter from "./reports.routes";
import tagsRouter from "./tags.routes";
import judgmentsRouter from "./judgments.routes";
import scoresRouter from "./scores.routes";
import providersRouter from "./providers.routes";
import responsesRouter from "./responses.routes";
import pricingRouter from "./pricing.routes";
import templatesRouter from "./templates.routes";
import litellmRouter from "./litellm.routes";

const router = express.Router();

// Mount feature routers
router.use("/models", modelsRouter);
router.use("/evals", evalsRouter);
router.use("/eval-runs", evalRunsRouter);
router.use("/reports", reportsRouter);
router.use("/tags", tagsRouter);
router.use("/judgments", judgmentsRouter);
router.use("/scores", scoresRouter);
router.use("/providers", providersRouter);
router.use("/responses", responsesRouter);
router.use("/pricing", pricingRouter);
router.use("/templates", templatesRouter);
router.use("/litellm", litellmRouter);

export default router;
