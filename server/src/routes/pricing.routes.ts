import express from "express";
import {
  getLatestPrice,
  getPriceHistory,
} from "../controllers/pricingController";

const router = express.Router();

// GET /api/pricing?modelId=<model_id>
router.get("/", getLatestPrice);

// GET /api/pricing/history?modelId=<model_id>
router.get("/history", getPriceHistory);

export default router;
