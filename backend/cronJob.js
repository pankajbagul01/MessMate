import cron from "node-cron";
import { runAutoBooking } from "./utils/autoBooking.js";

// Run at midnight (00:00) every day in server's local timezone
cron.schedule("0 0 * * *", async () => {
  try {
    await runAutoBooking();
  } catch (err) {
    console.error("❌ Cron job crashed unexpectedly:", err);
  }
});

console.log("✅ Cron job scheduled: auto-booking runs daily at midnight");