import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

dotenv.config();

// ── Startup env checks — fail fast before anything else ──────────────
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((key) => !process.env[key]);
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:", missing.join(", "));
  console.error("   Create a .env file based on .env.example and restart.");
  process.exit(1);
}

// ── Routes ────────────────────────────────────────────────────────────
import authRoutes       from "./routes/auth.js";
import bookingRoutes    from "./routes/booking.js";
import defaultRoutes    from "./routes/default.js";
import mealConfigRoutes from "./routes/mealConfig.js";
import messClosureRoutes from "./routes/messClosure.js";
import weeklyMenuRoutes from "./routes/weeklyMenu.js";

import "./cronJob.js";

const app  = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// ── Database ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => {
    console.error("❌ MongoDB connection error:", err.message);
    process.exit(1);
  });

// ── API routes ────────────────────────────────────────────────────────
app.use("/api/auth",         authRoutes);
app.use("/api/booking",      bookingRoutes);
app.use("/api/default",      defaultRoutes);
app.use("/api/mealconfig",   mealConfigRoutes);
app.use("/api/mess-closure", messClosureRoutes);
app.use("/api/weekly-menu",  weeklyMenuRoutes);

app.get("/", (req, res) => res.json({ message: "MessMate API is running" }));

// ── 404 handler ───────────────────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ message: `Route ${req.method} ${req.path} not found` });
});

// ── Global error handler ──────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ message: "Internal server error" });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});