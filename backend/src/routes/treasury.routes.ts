import { Router } from "express";
import { apiKeyAuth } from "../middleware/apiKeyAuth.js";
import * as treasuryController from "../controllers/treasury.controller.js";

const router = Router();

router.use(apiKeyAuth);

router.get("/balance", treasuryController.getBalance);
router.get("/datasets", treasuryController.getDatasets);

export const treasuryRoutes = router;
