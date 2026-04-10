import cron from "node-cron";
import { runAutoBooking } from "./utils/autoBooking.js";

// Run at midnight (00:00) every day
cron.schedule("0 0 * * *", () => {
  console.log("=".repeat(50));
  console.log("🕛 Midnight cron job triggered at:", new Date().toLocaleString());
  console.log("=".repeat(50));
  runAutoBooking();
});

console.log("✅ Cron job scheduled: Auto-booking will run daily at midnight");