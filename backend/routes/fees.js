import express    from "express";
import Booking    from "../models/Booking.js";
import User       from "../models/User.js";
import MealPricing from "../models/MealPricing.js";
import FeeRecord  from "../models/FeeRecord.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin }    from "../middleware/auth.js";

const router = express.Router();

// ── MEAL PRICING ──────────────────────────────────────────────────────

// GET current pricing
router.get("/pricing", authMiddleware, async (req, res) => {
  try {
    const pricing = await MealPricing.findOne().sort({ createdAt: -1 });
    res.json(pricing || { breakfast: 0, lunch: 0, dinner: 0 });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// SET pricing (admin only) — upsert singleton
router.post("/pricing", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { breakfast, lunch, dinner } = req.body;
    if (breakfast == null || lunch == null || dinner == null) {
      return res.status(400).json({ message: "breakfast, lunch and dinner prices are required" });
    }
    if ([breakfast, lunch, dinner].some(v => isNaN(v) || +v < 0)) {
      return res.status(400).json({ message: "Prices must be non-negative numbers" });
    }

    // Always keep only one pricing document
    let pricing = await MealPricing.findOne();
    if (pricing) {
      pricing.breakfast = +breakfast;
      pricing.lunch     = +lunch;
      pricing.dinner    = +dinner;
      pricing.updatedBy = req.user.id;
      await pricing.save();
    } else {
      pricing = await MealPricing.create({
        breakfast: +breakfast, lunch: +lunch, dinner: +dinner,
        updatedBy: req.user.id,
      });
    }
    res.json({ message: "Pricing updated", pricing });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── FEE CALCULATION ───────────────────────────────────────────────────

// GET fees for all students for a given month
// Also creates / refreshes FeeRecord snapshots
router.get("/monthly/:year/:month", authMiddleware, isAdmin, async (req, res) => {
  try {
    const year  = parseInt(req.params.year);
    const month = parseInt(req.params.month);

    if (isNaN(year) || isNaN(month) || month < 1 || month > 12) {
      return res.status(400).json({ message: "Invalid year or month" });
    }

    // Date range for the month
    const startDate = `${year}-${String(month).padStart(2,"0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

    // Get current pricing
    const pricing = await MealPricing.findOne().sort({ createdAt: -1 });
    const rates   = pricing || { breakfast: 0, lunch: 0, dinner: 0 };

    // Get all students
    const students = await User.find({ role: "student" }).lean();

    // Get all bookings for the month
    const bookings = await Booking.find({
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    // Group bookings by user
    const bookingMap = {};
    bookings.forEach(b => {
      const uid = b.user.toString();
      if (!bookingMap[uid]) bookingMap[uid] = { breakfast: 0, lunch: 0, dinner: 0 };
      bookingMap[uid][b.mealType]++;
    });

    // Get existing fee records for this month
    const existingRecords = await FeeRecord.find({ year, month }).lean();
    const recordMap = {};
    existingRecords.forEach(r => { recordMap[r.user.toString()] = r; });

    // Build response — one entry per student
    const fees = students.map(student => {
      const uid    = student._id.toString();
      const counts = bookingMap[uid] || { breakfast: 0, lunch: 0, dinner: 0 };
      const total  =
        counts.breakfast * rates.breakfast +
        counts.lunch     * rates.lunch +
        counts.dinner    * rates.dinner;

      const record = recordMap[uid];

      return {
        student: { _id: uid, name: student.name, email: student.email },
        breakfastCount: counts.breakfast,
        lunchCount:     counts.lunch,
        dinnerCount:    counts.dinner,
        totalMeals:     counts.breakfast + counts.lunch + counts.dinner,
        breakfastRate:  rates.breakfast,
        lunchRate:      rates.lunch,
        dinnerRate:     rates.dinner,
        totalAmount:    total,
        paid:           record?.paid   || false,
        paidAt:         record?.paidAt || null,
        notes:          record?.notes  || "",
        recordId:       record?._id    || null,
      };
    });

    res.json({
      year, month, startDate, endDate,
      rates: { breakfast: rates.breakfast, lunch: rates.lunch, dinner: rates.dinner },
      totalStudents:  students.length,
      totalPaid:      fees.filter(f => f.paid).length,
      totalUnpaid:    fees.filter(f => !f.paid && f.totalMeals > 0).length,
      totalRevenue:   fees.filter(f => f.paid).reduce((s, f) => s + f.totalAmount, 0),
      pendingRevenue: fees.filter(f => !f.paid).reduce((s, f) => s + f.totalAmount, 0),
      fees,
    });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// ── MARK PAID / UNPAID ────────────────────────────────────────────────

router.post("/mark-paid", authMiddleware, isAdmin, async (req, res) => {
  try {
    const { userId, year, month, paid, notes } = req.body;
    if (!userId || !year || !month) {
      return res.status(400).json({ message: "userId, year, and month are required" });
    }

    // Recalculate totals fresh so the snapshot is accurate
    const startDate = `${year}-${String(month).padStart(2,"0")}-01`;
    const lastDay   = new Date(year, month, 0).getDate();
    const endDate   = `${year}-${String(month).padStart(2,"0")}-${String(lastDay).padStart(2,"0")}`;

    const bookings = await Booking.find({
      user: userId,
      date: { $gte: startDate, $lte: endDate },
    }).lean();

    const counts = { breakfast: 0, lunch: 0, dinner: 0 };
    bookings.forEach(b => { counts[b.mealType]++; });

    const pricing = await MealPricing.findOne().sort({ createdAt: -1 });
    const rates   = pricing || { breakfast: 0, lunch: 0, dinner: 0 };

    const totalAmount =
      counts.breakfast * rates.breakfast +
      counts.lunch     * rates.lunch +
      counts.dinner    * rates.dinner;

    const record = await FeeRecord.findOneAndUpdate(
      { user: userId, year: +year, month: +month },
      {
        user:  userId,
        year:  +year,
        month: +month,
        breakfastCount: counts.breakfast,
        lunchCount:     counts.lunch,
        dinnerCount:    counts.dinner,
        totalMeals:     counts.breakfast + counts.lunch + counts.dinner,
        breakfastRate:  rates.breakfast,
        lunchRate:      rates.lunch,
        dinnerRate:     rates.dinner,
        totalAmount,
        paid:   !!paid,
        paidAt: paid ? new Date() : null,
        paidBy: paid ? req.user.id : null,
        notes:  notes || "",
      },
      { new: true, upsert: true }
    );

    res.json({ message: paid ? "Marked as paid" : "Marked as unpaid", record });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

// GET single student's fee history
router.get("/student/:userId", authMiddleware, isAdmin, async (req, res) => {
  try {
    const records = await FeeRecord
      .find({ user: req.params.userId })
      .sort({ year: -1, month: -1 })
      .limit(12)
      .lean();
    res.json(records);
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;