import express from "express";
import { analyzeImage } from "../controllers/analyzeController.js";
import { protect } from "../middlewares/auth.js";

const router = express.Router();

router.post("/", protect, analyzeImage);

export default router;
