import express from "express";
import MealConfig from "../models/MealConfig.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();


// 🔹 Add Config (Admin only)
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { date, meals } = req.body;

    const existing = await MealConfig.findOne({ date });
    if (existing) {
      return res.status(400).json({ message: "Config already exists for this date" });
    }

    const config = new MealConfig({ date, meals });
    await config.save();

    res.json({ message: "Meal config added", config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 🔹 Get Config by Date
router.get("/:date", authMiddleware, async (req, res) => {
  try {
    const config = await MealConfig.findOne({ date: req.params.date });

    if (!config) {
      return res.status(404).json({ message: "No config found" });
    }

    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 🔹 Get All Configs (optional)
router.get("/", authMiddleware, async (req, res) => {
  try {
    const data = await MealConfig.find();
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;