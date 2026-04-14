// ─────────────────────────────────────────────────────────────
//  MessMate — Dummy Data Seeder
//  Run: node seedDummyData.js
//  Place this file inside your /backend folder before running
// ─────────────────────────────────────────────────────────────

import mongoose from "mongoose";
import bcrypt from "bcryptjs";
import dotenv from "dotenv";

dotenv.config();

// ── Models ────────────────────────────────────────────────────
import User        from "./models/User.js";
import Booking     from "./models/Booking.js";
import WeeklyMenu  from "./models/WeeklyMenu.js";
import MealConfig  from "./models/MealConfig.js";
import MealPricing from "./models/MealPricing.js";
import FeeRecord   from "./models/FeeRecord.js";
import Default     from "./models/Default.js";
import MessClosure from "./models/MessClosure.js";

// ── Connect ───────────────────────────────────────────────────
await mongoose.connect(process.env.MONGODB_URI);
console.log("✅ MongoDB connected");

// ── Helpers ───────────────────────────────────────────────────
const hash = (pwd) => bcrypt.hashSync(pwd, 10);

// Returns "YYYY-MM-DD" for today + offset days
const dateStr = (offsetDays = 0) => {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split("T")[0];
};

// ─────────────────────────────────────────────────────────────
//  1. CLEAR existing dummy data (keeps your real admin)
// ─────────────────────────────────────────────────────────────
console.log("\n🧹 Clearing old dummy data...");
await Booking.deleteMany({});
await FeeRecord.deleteMany({});
await Default.deleteMany({});
await MealConfig.deleteMany({});
await WeeklyMenu.deleteMany({});
await MealPricing.deleteMany({});
await MessClosure.deleteMany({});
await User.deleteMany({ role: "student" }); // only removes students
console.log("✅ Cleared");

// ─────────────────────────────────────────────────────────────
//  2. STUDENTS
// ─────────────────────────────────────────────────────────────
console.log("\n👨‍🎓 Seeding students...");
const students = await User.insertMany([
  { name: "Aarav Sharma",   email: "aarav@student.com",   password: hash("student123"), role: "student" },
  { name: "Priya Desai",    email: "priya@student.com",   password: hash("student123"), role: "student" },
  { name: "Rohit Patil",    email: "rohit@student.com",   password: hash("student123"), role: "student" },
  { name: "Sneha Kulkarni", email: "sneha@student.com",   password: hash("student123"), role: "student" },
  { name: "Karan Mehta",    email: "karan@student.com",   password: hash("student123"), role: "student" },
  { name: "Ananya Joshi",   email: "ananya@student.com",  password: hash("student123"), role: "student" },
  { name: "Vivek Nair",     email: "vivek@student.com",   password: hash("student123"), role: "student" },
  { name: "Pooja Rane",     email: "pooja@student.com",   password: hash("student123"), role: "student" },
]);
console.log(`✅ ${students.length} students created`);

// ─────────────────────────────────────────────────────────────
//  3. MEAL PRICING
// ─────────────────────────────────────────────────────────────
console.log("\n💰 Seeding meal pricing...");
await MealPricing.create({
  breakfast: 30,
  lunch:     60,
  dinner:    50,
});
console.log("✅ Pricing set — Breakfast ₹30 | Lunch ₹60 | Dinner ₹50");

// ─────────────────────────────────────────────────────────────
//  4. WEEKLY MENU
// ─────────────────────────────────────────────────────────────
console.log("\n🗓️  Seeding weekly menu...");
const weeklyMenuData = [
  {
    dayOfWeek: "monday",
    meals: {
      breakfast: [{ name: "Poha" }, { name: "Banana" }, { name: "Tea" }],
      lunch:     [{ name: "Dal Tadka" }, { name: "Jeera Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }, { name: "Salad" }],
      dinner:    [{ name: "Paneer Butter Masala" }, { name: "Naan", hasQuantity: true, maxQuantity: 3 }, { name: "Kheer" }],
    },
  },
  {
    dayOfWeek: "tuesday",
    meals: {
      breakfast: [{ name: "Idli Sambar" }, { name: "Coconut Chutney" }, { name: "Coffee" }],
      lunch:     [{ name: "Rajma Chawal" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }, { name: "Raita" }],
      dinner:    [{ name: "Aloo Matar" }, { name: "Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 3 }],
    },
  },
  {
    dayOfWeek: "wednesday",
    meals: {
      breakfast: [{ name: "Upma" }, { name: "Boiled Egg" }, { name: "Tea" }],
      lunch:     [{ name: "Chole" }, { name: "Bhature", hasQuantity: true, maxQuantity: 3 }, { name: "Lassi" }],
      dinner:    [{ name: "Mixed Veg Curry" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }, { name: "Rice" }],
    },
  },
  {
    dayOfWeek: "thursday",
    meals: {
      breakfast: [{ name: "Paratha", hasQuantity: true, maxQuantity: 2 }, { name: "Curd" }, { name: "Pickle" }, { name: "Tea" }],
      lunch:     [{ name: "Dal Makhani" }, { name: "Steamed Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }, { name: "Salad" }],
      dinner:    [{ name: "Egg Curry" }, { name: "Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 3 }],
    },
  },
  {
    dayOfWeek: "friday",
    meals: {
      breakfast: [{ name: "Medu Vada" }, { name: "Sambar" }, { name: "Tea" }],
      lunch:     [{ name: "Palak Paneer" }, { name: "Jeera Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }],
      dinner:    [{ name: "Chicken Curry" }, { name: "Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 3 }, { name: "Papad" }],
    },
  },
  {
    dayOfWeek: "saturday",
    meals: {
      breakfast: [{ name: "Puri Bhaji" }, { name: "Tea" }],
      lunch:     [{ name: "Biryani" }, { name: "Raita" }, { name: "Papad" }],
      dinner:    [{ name: "Dal Fry" }, { name: "Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }],
    },
  },
  {
    dayOfWeek: "sunday",
    meals: {
      breakfast: [{ name: "Bread Butter" }, { name: "Jam" }, { name: "Milk" }],
      lunch:     [{ name: "Special Thali" }, { name: "Gulab Jamun" }],
      dinner:    [{ name: "Veg Pulao" }, { name: "Raita" }, { name: "Papad" }],
    },
  },
];
await WeeklyMenu.insertMany(weeklyMenuData);
console.log("✅ Weekly menu seeded for all 7 days");

// ─────────────────────────────────────────────────────────────
//  5. MEAL CONFIG (specific dates — past 7 days + next 7 days)
// ─────────────────────────────────────────────────────────────
console.log("\n🍱 Seeding meal configs for 14 days...");
const mealConfigDates = [];
for (let i = -7; i <= 7; i++) {
  mealConfigDates.push({
    date: dateStr(i),
    meals: {
      breakfast: [{ name: "Poha" }, { name: "Tea" }, { name: "Banana" }],
      lunch:     [{ name: "Dal Tadka" }, { name: "Rice" }, { name: "Roti", hasQuantity: true, maxQuantity: 4 }, { name: "Salad" }],
      dinner:    [{ name: "Paneer Sabzi" }, { name: "Roti", hasQuantity: true, maxQuantity: 3 }, { name: "Rice" }],
    },
  });
}
await MealConfig.insertMany(mealConfigDates);
console.log("✅ Meal configs created for 14 days");

// ─────────────────────────────────────────────────────────────
//  6. DEFAULT PREFERENCES (for each student)
// ─────────────────────────────────────────────────────────────
console.log("\n⚙️  Seeding default preferences...");
const defaultPrefs = students.map((s, i) => ({
  user: s._id,
  meals: {
    breakfast: { enabled: i % 3 !== 0, items: [{ name: "Poha" }, { name: "Tea" }] },
    lunch:     { enabled: true,         items: [{ name: "Dal Tadka" }, { name: "Rice" }, { name: "Roti", quantity: 3 }] },
    dinner:    { enabled: i % 2 === 0,  items: [{ name: "Paneer Sabzi" }, { name: "Roti", quantity: 2 }] },
  },
}));
await Default.insertMany(defaultPrefs);
console.log("✅ Default preferences set for all students");

// ─────────────────────────────────────────────────────────────
//  7. BOOKINGS (past 7 days — realistic mix, not everyone books all meals)
// ─────────────────────────────────────────────────────────────
console.log("\n📅 Seeding bookings...");
const bookings = [];
const mealTypes = ["breakfast", "lunch", "dinner"];

for (let day = -7; day <= 1; day++) {
  const date = dateStr(day);
  students.forEach((student, si) => {
    mealTypes.forEach((mealType, mi) => {
      // Simulate realistic attendance — not everyone books every meal
      const shouldBook = Math.random() > 0.25;
      if (!shouldBook) return;

      bookings.push({
        user: student._id,
        date,
        mealType,
        items: mealType === "breakfast"
          ? [{ name: "Poha" }, { name: "Tea" }]
          : mealType === "lunch"
          ? [{ name: "Dal Tadka" }, { name: "Rice" }, { name: "Roti", quantity: (si % 3) + 2 }]
          : [{ name: "Paneer Sabzi" }, { name: "Roti", quantity: 2 }],
      });
    });
  });
}
await Booking.insertMany(bookings);
console.log(`✅ ${bookings.length} bookings created`);

// ─────────────────────────────────────────────────────────────
//  8. FEE RECORDS (current month)
// ─────────────────────────────────────────────────────────────
console.log("\n💸 Seeding fee records...");
const now = new Date();
const year  = now.getFullYear();
const month = now.getMonth() + 1;

const feeRecords = students.map((s, i) => ({
  user:           s._id,
  year,
  month,
  breakfastCount: 18 + i,
  lunchCount:     24 + i,
  dinnerCount:    15 + (i % 4),
  totalMeals:     57 + i * 2,
  breakfastRate:  30,
  lunchRate:      60,
  dinnerRate:     50,
  totalAmount:    (18 + i) * 30 + (24 + i) * 60 + (15 + (i % 4)) * 50,
  paid:           i % 3 === 0,  // every 3rd student has paid
  paidAt:         i % 3 === 0 ? new Date() : null,
  notes:          i % 3 === 0 ? "Paid via cash" : "",
}));
await FeeRecord.insertMany(feeRecords);
console.log(`✅ ${feeRecords.length} fee records created`);

// ─────────────────────────────────────────────────────────────
//  9. MESS CLOSURE (one upcoming holiday)
// ─────────────────────────────────────────────────────────────
console.log("\n🔒 Seeding mess closure...");
await MessClosure.create({
  date:          dateStr(5),
  reason:        "College Annual Day — Mess Closed",
  affectedMeals: ["breakfast", "lunch", "dinner"],
});
console.log(`✅ Mess closure added for ${dateStr(5)}`);

// ─────────────────────────────────────────────────────────────
//  Done!
// ─────────────────────────────────────────────────────────────
console.log("\n🎉 All dummy data seeded successfully!\n");
console.log("📋 Student login credentials (all same password):");
console.log("   Password: student123");
students.forEach(s => console.log(`   ${s.email}`));
console.log("\n👉 Now start your server and take screenshots!\n");

await mongoose.disconnect();
process.exit(0);
