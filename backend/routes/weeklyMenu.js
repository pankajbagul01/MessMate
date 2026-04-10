import express from "express";
import WeeklyMenu from "../models/WeeklyMenu.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🔹 Get all weekly menus
router.get("/", authMiddleware, async (req, res) => {
  try {
    const menus = await WeeklyMenu.find().sort({ dayOfWeek: 1 });
    res.json(menus);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get menu for specific day
router.get("/:dayOfWeek", authMiddleware, async (req, res) => {
  try {
    const menu = await WeeklyMenu.findOne({ dayOfWeek: req.params.dayOfWeek });
    if (!menu) {
      return res.status(404).json({ message: "Menu not found for this day" });
    }
    res.json(menu);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Create or update weekly menu (Admin only)
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { dayOfWeek, meals } = req.body;
    
    const menu = await WeeklyMenu.findOneAndUpdate(
      { dayOfWeek },
      { dayOfWeek, meals },
      { new: true, upsert: true }
    );
    
    res.json({ message: "Weekly menu saved", menu });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Delete weekly menu (Admin only)
router.delete("/:dayOfWeek", authMiddleware, isAdmin, async (req, res) => {
  try {
    await WeeklyMenu.findOneAndDelete({ dayOfWeek: req.params.dayOfWeek });
    res.json({ message: "Weekly menu deleted" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;