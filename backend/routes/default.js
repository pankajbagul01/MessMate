import express from "express";
import Default from "../models/Default.js";
import authMiddleware from "../middleware/auth.js";

const router = express.Router();


// 🔹 Set / Update Default
router.post("/", authMiddleware, async (req, res) => {
  try {
    const data = req.body;

    const updated = await Default.findOneAndUpdate(
      { user: req.user.id },
      { ...data, user: req.user.id },
      { new: true, upsert: true }
    );

    res.json({ message: "Default updated", updated });

  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});


// 🔹 Get My Default
router.get("/", authMiddleware, async (req, res) => {
  try {
    const data = await Default.findOne({ user: req.user.id });
    res.json(data);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;