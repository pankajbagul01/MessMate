import express from "express";
import Booking from "../models/Booking.js";
import MealConfig from "../models/MealConfig.js";
import authMiddleware from "../middleware/auth.js";
import { isAdmin } from "../middleware/auth.js";
import Default from "../models/Default.js";
import MessClosure from "../models/MessClosure.js";
import WeeklyMenu from "../models/WeeklyMenu.js";


const router = express.Router();

// ========== HELPER FUNCTIONS ==========

// Parse YYYY-MM-DD as a LOCAL date (prevents UTC offset shifting the day in IST etc.)
const parseLocalDate = (dateStr) => {
  const [y, m, d] = dateStr.split("-").map(Number);
  return new Date(y, m - 1, d);
};

// Today's date as YYYY-MM-DD in local time
const todayLocalStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

const canModifyBooking = (date) => {
  // Simple string comparison works because format is YYYY-MM-DD
  return date >= todayLocalStr();
};

const isBeforeDeadline = (date) => {
  const now = new Date();
  // Deadline: 11:59:59 PM of the day BEFORE the booking date (local time)
  const deadline = parseLocalDate(date);
  deadline.setDate(deadline.getDate() - 1);
  deadline.setHours(23, 59, 59, 999);
  return now <= deadline;
};

const isMessClosed = async (date, mealType) => {
  const closure = await MessClosure.findOne({ date });
  if (!closure) return false;
  return closure.affectedMeals.includes(mealType);
};

// Add this helper function to get menu based on date
const getMenuForDate = async (date) => {
    // First check if there's a date-specific config (override)
    const dateConfig = await MealConfig.findOne({ date });
    if (dateConfig) {
      return { source: "date-specific", menu: dateConfig };
    }
    
    // Otherwise get weekly menu based on day of week
    // Parse as local date to avoid UTC offset giving wrong weekday (e.g. IST +5:30)
    const dayNames = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
    const [yr, mo, dy] = date.split("-").map(Number);
    const dateObj = new Date(yr, mo - 1, dy);
    const dayOfWeek = dayNames[dateObj.getDay()];
    
    const weeklyMenu = await WeeklyMenu.findOne({ dayOfWeek });
    if (weeklyMenu) {
      return { source: "weekly", menu: weeklyMenu };
    }
    
    return { source: "none", menu: null };
  };

// ========== BOOKING ROUTES ==========

// 🔹 Create Booking
router.post("/", authMiddleware, async (req, res) => {
    try {
        const { date, mealType, items } = req.body;

        // Check if date is valid
        if (!canModifyBooking(date)) {
            return res.status(400).json({ message: "Cannot book for past dates" });
        }

        // Check deadline
        if (!isBeforeDeadline(date)) {
            return res.status(400).json({ 
                message: "Booking deadline passed. Must book before 11:59 PM previous day" 
            });
        }

        // Check if mess is closed
        const closed = await isMessClosed(date, mealType);
        if (closed) {
            return res.status(400).json({ message: "Mess is closed on this date for this meal" });
        }

        // Get config for that date (date-specific override first, then weekly menu fallback)
        const { menu: config } = await getMenuForDate(date);
        if (!config) {
            return res.status(400).json({ message: "No menu configured for this date" });
        }

        const mealItems = config.meals[mealType];
        if (!mealItems || mealItems.length === 0) {
            return res.status(400).json({ message: "Invalid meal type or no items available" });
        }

        // Validation
        for (let item of items) {
            const configItem = mealItems.find(i => i.name === item.name);

            if (!configItem) {
                return res.status(400).json({ message: `${item.name} not allowed` });
            }

            if (configItem.hasQuantity) {
                if (!item.quantity) {
                    return res.status(400).json({ message: `${item.name} needs quantity` });
                }

                if (item.quantity > configItem.maxQuantity) {
                    return res.status(400).json({
                        message: `${item.name} max allowed is ${configItem.maxQuantity}`
                    });
                }
            }
        }

        // Check if booking already exists (to replace)
        const existingBooking = await Booking.findOne({
            user: req.user.id,
            date,
            mealType,
        });

        if (existingBooking) {
            // Replace existing booking (manual override)
            existingBooking.items = items;
            await existingBooking.save();
            return res.json({ message: "Booking updated successfully", booking: existingBooking });
        }

        // Create new booking
        const booking = new Booking({
            user: req.user.id,
            date,
            mealType,
            items,
        });

        await booking.save();

        res.json({ message: "Booking successful", booking });

    } catch (err) {
        if (err.code === 11000) {
            return res.status(400).json({ message: "Already booked this meal" });
        }
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Get My Bookings
router.get("/my", authMiddleware, async (req, res) => {
    try {
        const data = await Booking.find({ user: req.user.id }).sort({ date: -1 });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Get Booking by Date
router.get("/my/:date", authMiddleware, async (req, res) => {
    try {
        const data = await Booking.find({
            user: req.user.id,
            date: req.params.date,
        });
        res.json(data);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Delete Booking (Cancel)
router.delete("/:id", authMiddleware, async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        
        if (!booking) {
            return res.status(404).json({ message: "Booking not found" });
        }
        
        // Check if user owns this booking
        if (booking.user.toString() !== req.user.id) {
            return res.status(403).json({ message: "Not authorized" });
        }
        
        // Check deadline for cancellation
        if (!isBeforeDeadline(booking.date)) {
            return res.status(400).json({ 
                message: "Cancellation deadline passed. Must cancel before 11:59 PM previous day" 
            });
        }
        
        await Booking.findByIdAndDelete(req.params.id);
        res.json({ message: "Booking cancelled" });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Admin Analytics (Item-wise breakdown)
router.get("/analytics/:date", authMiddleware, isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find({ date: req.params.date });

        const result = {
            breakfast: {},
            lunch: {},
            dinner: {},
        };

        bookings.forEach((booking) => {
            const meal = booking.mealType;

            booking.items.forEach((item) => {
                if (!result[meal][item.name]) {
                    result[meal][item.name] = 0;
                }

                if (item.quantity) {
                    result[meal][item.name] += item.quantity;
                } else {
                    result[meal][item.name] += 1;
                }
            });
        });

        res.json(result);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Smart Booking (Check existing or return default)
router.get("/smart/:date", authMiddleware, async (req, res) => {
    try {
        const { date } = req.params;

        // Check if mess is closed for any meals
        const closures = await MessClosure.findOne({ date });
        
        // Get existing bookings
        const bookings = await Booking.find({
            user: req.user.id,
            date,
        });

        if (bookings.length > 0) {
            return res.json({
                source: "booking",
                data: bookings,
                closures: closures || null,
            });
        }

        // If no booking → get default
        const defaultData = await Default.findOne({ user: req.user.id });

        if (!defaultData) {
            return res.json({
                source: "none",
                data: null,
                closures: closures || null,
            });
        }

        // Convert default → booking format (only enabled meals)
        const result = [];
        ["breakfast", "lunch", "dinner"].forEach((meal) => {
            if (defaultData.meals[meal].enabled) {
                // Check if this meal is closed
                const isMealClosed = closures && closures.affectedMeals.includes(meal);
                if (!isMealClosed) {
                    result.push({
                        mealType: meal,
                        items: defaultData.meals[meal].items,
                    });
                }
            }
        });

        res.json({
            source: "default",
            data: result,
            closures: closures || null,
        });
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Monthly Consumption Report (Admin only)
router.get("/monthly-report/:year/:month", authMiddleware, isAdmin, async (req, res) => {
    try {
        const { year, month } = req.params;
        
        // Create date range
        const startDate = `${year}-${month.padStart(2, '0')}-01`;
        const endDateObj = new Date(parseInt(year), parseInt(month), 0);
        const endDate = endDateObj.toISOString().split('T')[0];
        
        // Get all bookings in date range
        const bookings = await Booking.find({
            date: { $gte: startDate, $lte: endDate }
        }).populate('user', 'name email');
        
        // Group by user
        const report = {};
        
        bookings.forEach(booking => {
            const userId = booking.user._id.toString();
            
            if (!report[userId]) {
                report[userId] = {
                    name: booking.user.name,
                    email: booking.user.email,
                    breakfast: 0,
                    lunch: 0,
                    dinner: 0,
                    totalMeals: 0,
                    itemDetails: {},
                };
            }
            
            // Count meal types
            report[userId][booking.mealType]++;
            report[userId].totalMeals++;
            
            // Track item consumption
            booking.items.forEach(item => {
                if (!report[userId].itemDetails[item.name]) {
                    report[userId].itemDetails[item.name] = 0;
                }
                const quantity = item.quantity || 1;
                report[userId].itemDetails[item.name] += quantity;
            });
        });
        
        res.json({
            year,
            month,
            startDate,
            endDate,
            totalStudents: Object.keys(report).length,
            totalBookings: bookings.length,
            report: Object.values(report),
        });
        
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

// 🔹 Cooking Summary (Admin - to know how much to cook)
router.get("/cooking-summary/:date", authMiddleware, isAdmin, async (req, res) => {
    try {
        const bookings = await Booking.find({ date: req.params.date });
        
        const summary = {
            breakfast: {},
            lunch: {},
            dinner: {},
            totalStudents: new Set(),
            totalBookings: bookings.length,
        };
        
        bookings.forEach(booking => {
            summary.totalStudents.add(booking.user.toString());
            
            const meal = booking.mealType;
            booking.items.forEach(item => {
                if (!summary[meal][item.name]) {
                    summary[meal][item.name] = 0;
                }
                const quantity = item.quantity || 1;
                summary[meal][item.name] += quantity;
            });
        });
        
        summary.totalStudents = summary.totalStudents.size;
        
        res.json(summary);
    } catch (err) {
        res.status(500).json({ message: err.message });
    }
});

export default router;
// 🔹 Get menu for a date (date-specific OR weekly fallback) - for student booking page
router.get("/menu/:date", authMiddleware, async (req, res) => {
  try {
    const { date } = req.params;
    const result = await getMenuForDate(date);
    if (!result.menu) {
      return res.status(404).json({ message: "No menu available for this date" });
    }
    res.json({ source: result.source, menu: result.menu, date });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});