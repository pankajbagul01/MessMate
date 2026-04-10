import express from "express";
import mongoose from "mongoose";
import cors from "cors";
import dotenv from "dotenv";

// Import routes
import authRoutes from "./routes/auth.js";
import bookingRoutes from "./routes/booking.js";
import defaultRoutes from "./routes/default.js";
import mealConfigRoutes from "./routes/mealConfig.js";
import messClosureRoutes from "./routes/messClosure.js";
import weeklyMenuRoutes from "./routes/weeklyMenu.js";


// Import cron job (this starts the auto-booking scheduler)
import "./cronJob.js";

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Database connection
mongoose.connect(process.env.MONGODB_URI || "mongodb://localhost:27017/messmate")
  .then(() => console.log("✅ MongoDB connected"))
  .catch(err => console.error("❌ MongoDB connection error:", err));

// Routes
app.use("/api/auth", authRoutes);
app.use("/api/booking", bookingRoutes);
app.use("/api/default", defaultRoutes);
app.use("/api/mealconfig", mealConfigRoutes);
app.use("/api/mess-closure", messClosureRoutes);
app.use("/api/weekly-menu", weeklyMenuRoutes);


// Test route
app.get("/", (req, res) => {
  res.json({ message: "Mess Mate API is running" });
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
});