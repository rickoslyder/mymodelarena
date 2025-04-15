import { Router } from "express";
import * as modelController from "../controllers/modelController";

const router = Router();

// Define routes for models here
router.post("/", modelController.createModel);
router.get("/", modelController.getAllModels);
router.get("/:id", modelController.getModelById);
router.put("/:id", modelController.updateModel);
router.delete("/:id", modelController.deleteModel);

export default router;
