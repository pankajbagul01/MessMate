import express from "express";
import MessClosure from "../models/MessClosure.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/auth.js";

const router = express.Router();

// 🔹 Add closure date (Admin only)
router.post("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { date, reason, affectedMeals } = req.body;
    
    // Validate date format
    if (!date || !date.match(/^\d{4}-\d{2}-\d{2}$/)) {
      return res.status(400).json({ message: "Invalid date format. Use YYYY-MM-DD" });
    }
    
    const closure = new MessClosure({
      date,
      reason: reason || "Mess closed",
      affectedMeals: affectedMeals || ["breakfast", "lunch", "dinner"],
    });
    
    await closure.save();
    res.json({ message: "Closure date added", closure });
  } catch (err) {
    if (err.code === 11000) {
      return res.status(400).json({ message: "Date already marked as closed" });
    }
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get all closures
router.get("/", authMiddleware, isAdmin, async (req, res) => {
  try {
    const closures = await MessClosure.find().sort({ date: 1 });
    res.json(closures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Get upcoming closures
router.get("/upcoming", authMiddleware, async (req, res) => {
  try {
    const today = new Date().toISOString().split('T')[0];
    const closures = await MessClosure.find({ 
      date: { $gte: today } 
    }).sort({ date: 1 });
    res.json(closures);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Remove closure date
router.delete("/:date", authMiddleware, isAdmin, async (req, res) => {
  try {
    const deleted = await MessClosure.findOneAndDelete({ date: req.params.date });
    if (!deleted) {
      return res.status(404).json({ message: "Closure date not found" });
    }
    res.json({ message: "Closure date removed" });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// 🔹 Check if date is closed (for students)
router.get("/check/:date", authMiddleware, async (req, res) => {
  try {
    const closure = await MessClosure.findOne({ date: req.params.date });
    res.json({ 
      isClosed: !!closure,
      reason: closure?.reason || null,
      affectedMeals: closure?.affectedMeals || [] 
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;