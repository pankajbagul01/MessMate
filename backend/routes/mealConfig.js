import express from "express";
import MealConfig from "../models/MealConfig.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🔹 Get All Configs (admin)
router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const data = await MealConfig.find().sort({ date: -1 });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get Config by Date (any authenticated user — needed for booking)
router.get("/:date", authMiddleware, async (req, res) => {
  try {
    const config = await MealConfig.findOne({ date: req.params.date });
    if (!config) return res.status(404).json({ message: "No config found for this date" });
    res.json(config);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Create Config (admin only)
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { date, meals } = req.body;
    if (!date || !meals) return res.status(400).json({ message: "Date and meals are required" });

    const existing = await MealConfig.findOne({ date });
    if (existing) return res.status(400).json({ message: "Config already exists for this date. Use PUT to update." });

    const config = new MealConfig({ date, meals });
    await config.save();
    res.json({ message: "Meal config created", config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Update Config (admin only) — upsert so create+update in one call
router.put("/:date", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { meals } = req.body;
    if (!meals) return res.status(400).json({ message: "Meals are required" });

    const config = await MealConfig.findOneAndUpdate(
      { date: req.params.date },
      { date: req.params.date, meals },
      { new: true, upsert: true }
    );
    res.json({ message: "Meal config saved", config });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Delete Config (admin only)
router.delete("/:date", authMiddleware, isAdmin, async (req, res) => {
  try {
    const deleted = await MealConfig.findOneAndDelete({ date: req.params.date });
    if (!deleted) return res.status(404).json({ message: "Config not found" });
    res.json({ message: "Meal config deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;