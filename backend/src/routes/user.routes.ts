import { Router } from "express";
import * as userController from "../controllers/user.controller.js";

const router = Router();

router.post("/create", userController.create);

export const userRoutes = router;
