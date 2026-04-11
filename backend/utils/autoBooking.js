import Booking    from "../models/Booking.js";
import Default    from "../models/Default.js";
import MealConfig from "../models/MealConfig.js";
import WeeklyMenu from "../models/WeeklyMenu.js";
import MessClosure from "../models/MessClosure.js";

// ── Date helpers (local time, not UTC) ───────────────────────────────
const getTomorrowLocalStr = () => {
  const d = new Date();
  d.setDate(d.getDate() + 1);
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

// Get menu for a date: date-specific config first, then weekly menu fallback
const getMenuForDate = async (dateStr) => {
  // 1. Check for a date-specific override
  const dateConfig = await MealConfig.findOne({ date: dateStr });
  if (dateConfig) return { source: "date-specific", meals: dateConfig.meals };

  // 2. Fall back to weekly menu for that weekday
  //    Parse as local date to avoid UTC shifting the weekday
  const [y, m, d]  = dateStr.split("-").map(Number);
  const dateObj    = new Date(y, m - 1, d);
  const dayNames   = ["sunday","monday","tuesday","wednesday","thursday","friday","saturday"];
  const dayOfWeek  = dayNames[dateObj.getDay()];
  const weeklyMenu = await WeeklyMenu.findOne({ dayOfWeek });
  if (weeklyMenu) return { source: "weekly", meals: weeklyMenu.meals };

  return { source: "none", meals: null };
};

const isMessClosed = async (date, mealType) => {
  const closure = await MessClosure.findOne({ date });
  if (!closure) return false;
  return closure.affectedMeals.includes(mealType);
};

const hasExistingBooking = async (userId, date, mealType) => {
  const existing = await Booking.findOne({ user: userId, date, mealType });
  return !!existing;
};

// ── Main auto-booking runner ─────────────────────────────────────────
export const runAutoBooking = async () => {
  const tomorrow = getTomorrowLocalStr();
  const SEP = "=".repeat(50);
  console.log(SEP);
  console.log(`🤖 Auto-booking started for: ${tomorrow}`);

  // Get menu for tomorrow (date-specific or weekly)
  const { source, meals } = await getMenuForDate(tomorrow);

  if (!meals) {
    console.log(`⚠️  No menu configured for ${tomorrow} (checked date-specific + weekly). Skipping.`);
    console.log(SEP);
    return;
  }

  console.log(`📋 Menu source: ${source}`);

  // Get all students who have default preferences set
  const defaults = await Default.find().lean();
  console.log(`👥 Found ${defaults.length} students with default preferences`);

  let booked  = 0;
  let skipped = 0;
  let errors  = 0;

  for (const pref of defaults) {
    const userId = pref.user;

    for (const mealType of ["breakfast", "lunch", "dinner"]) {
      const mealPref = pref.meals?.[mealType];

      // Skip if this meal is not enabled in their defaults
      if (!mealPref?.enabled) continue;

      // Skip if meal not in today's menu
      const menuItems = meals[mealType];
      if (!menuItems || menuItems.length === 0) {
        console.log(`  ⏭  ${mealType} not in menu for ${tomorrow}, skipping`);
        skipped++;
        continue;
      }

      // Skip if mess is closed for this meal
      const closed = await isMessClosed(tomorrow, mealType);
      if (closed) {
        console.log(`  🔒 Mess closed for ${mealType} on ${tomorrow}`);
        skipped++;
        continue;
      }

      // Skip if already manually booked
      const alreadyBooked = await hasExistingBooking(userId, tomorrow, mealType);
      if (alreadyBooked) {
        skipped++;
        continue;
      }

      // Determine items to book:
      // Use the student's saved default items IF they exist AND are valid for today's menu.
      // Otherwise fall back to booking all available menu items.
      const menuItemNames = new Set(menuItems.map(i => i.name));
      let itemsToBook = (mealPref.items || []).filter(i => menuItemNames.has(i.name));

      if (itemsToBook.length === 0) {
        // Student's saved items don't match today's menu — book everything available
        itemsToBook = menuItems.map(i => ({
          name: i.name,
          quantity: i.hasQuantity ? 1 : null,
        }));
      }

      try {
        const booking = new Booking({
          user:     userId,
          date:     tomorrow,
          mealType,
          items:    itemsToBook,
        });
        await booking.save();
        booked++;
        console.log(`  ✅ Auto-booked ${mealType} for user ${userId}`);
      } catch (err) {
        if (err.code === 11000) {
          // Duplicate key — race condition, already booked between our check and save
          skipped++;
        } else {
          errors++;
          console.error(`  ❌ Failed ${mealType} for user ${userId}: ${err.message}`);
        }
      }
    }
  }

  console.log(`📊 Result: ${booked} booked, ${skipped} skipped, ${errors} errors`);
  console.log(SEP);
};