import express    from "express";
import mongoose   from "mongoose";
import cors       from "cors";
import dotenv     from "dotenv";
import rateLimit  from "express-rate-limit";

dotenv.config();

// ── Startup env checks — fail fast ───────────────────────────────────
const REQUIRED_ENV = ["MONGODB_URI", "JWT_SECRET"];
const missing = REQUIRED_ENV.filter((k) => !process.env[k]);
if (missing.length > 0) {
  console.error("❌ Missing required environment variables:", missing.join(", "));
  console.error("   Create a .env file based on .env.example and restart.");
  process.exit(1);
}

// ── Rate limiters ─────────────────────────────────────────────────────

// Strict limiter for auth endpoints — 10 attempts per 15 min per IP
const authLimiter = rateLimit({
  windowMs:         15 * 60 * 1000,
  max:              10,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { message: "Too many login attempts. Please try again in 15 minutes." },
});

// General API limiter — 200 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs:         60 * 1000,
  max:              200,
  standardHeaders:  true,
  legacyHeaders:    false,
  message: { message: "Too many requests. Please slow down." },
});

// ── Routes ────────────────────────────────────────────────────────────
import authRoutes        from "./routes/auth.js";
import bookingRoutes     from "./routes/booking.js";
import defaultRoutes     from "./routes/default.js";
import mealConfigRoutes  from "./routes/mealConfig.js";
import messClosureRoutes from "./routes/messClosure.js";
import weeklyMenuRoutes  from "./routes/weeklyMenu.js";

import "./cronJob.js";
import { seedAdmin } from "./utils/seedAdmin.js";

const app  = express();
const PORT = process.env.PORT || 5000;

// ── Middleware ────────────────────────────────────────────────────────
app.use(cors());
app.use(express.json());
app.use("/api", apiLimiter);                   // general limit on all API routes
app.use("/api/auth", authLimiter);             // stricter limit on auth routes

// ── Database ──────────────────────────────────────────────────────────
mongoose
  .connect(process.env.MONGODB_URI)
  .then(async () => {
    console.log("✅ MongoDB connected");
    await seedAdmin();
  })
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

// ── Start ─────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || "development"}`);
});