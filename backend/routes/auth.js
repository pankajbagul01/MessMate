import express from "express";
import User    from "../models/User.js";
import bcrypt  from "bcryptjs";
import jwt     from "jsonwebtoken";

const router = express.Router();

// ── REGISTER (students only — role is never accepted from client) ─────
router.post("/register", async (req, res) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }
    if (password.length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    // Role is ALWAYS student — never trust the client
    const user = new User({ name, email, password: hashedPassword, role: "student" });
    await user.save();

    res.json({ message: "Registered successfully. You can now log in." });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── LOGIN ─────────────────────────────────────────────────────────────
router.post("/login", async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ message: "Email and password are required" });
    }

    const user = await User.findOne({ email });
    if (!user) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) {
      return res.status(400).json({ message: "Invalid email or password" });
    }

    const token = jwt.sign(
      { id: user._id, role: user.role, name: user.name },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN || "7d" }
    );

    res.json({
      token,
      user: { id: user._id, name: user.name, role: user.role, email: user.email },
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;