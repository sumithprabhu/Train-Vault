import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import * as modelController from "../controllers/model.controller.js";

const router = Router();

router.use(apiKeyAuth);

router.post("/register", modelController.register);
router.get("/", modelController.get);
router.get("/:provenanceHash", modelController.get);

export const modelRoutes = router;
