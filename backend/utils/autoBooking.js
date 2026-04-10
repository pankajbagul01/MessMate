import Booking from "../models/Booking.js";
import Default from "../models/Default.js";
import MealConfig from "../models/MealConfig.js";
import MessClosure from "../models/MessClosure.js";

const getTomorrowDate = () => {
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  return tomorrow.toISOString().split('T')[0];
};

const isMessClosed = async (date, mealType) => {
  const closure = await MessClosure.findOne({ date });
  if (!closure) return false;
  return closure.affectedMeals.includes(mealType);
};

const hasExistingBooking = async (userId, date, mealType) => {
  const existing = await Booking.findOne({
    user: userId,
    date,
    mealType,
  });
  return !!existing;
};

export const runAutoBooking = async () => {
  const tomorrow = getTomorrowDate();
  console.log(`Running auto-booking for date: ${tomorrow}`);
  
  // Check if meal config exists for tomorrow
  const config = await MealConfig.findOne({ date: tomorrow });
  if (!config) {
    console.log(`No meal config for ${tomorrow}, skipping auto-booking`);
    return;
  }
  
  // Get all users with defaults
  const defaults = await Default.find();
  console.log(`Found ${defaults.length} users with default preferences`);
  
  let autoBookedCount = 0;
  
  for (const defaultPref of defaults) {
    const userId = defaultPref.user;
    
    for (const [mealType, mealData] of Object.entries(defaultPref.meals)) {
      // Check if default enabled for this meal
      if (!mealData.enabled) continue;
      
      // Check if mess is closed
      const closed = await isMessClosed(tomorrow, mealType);
      if (closed) {
        console.log(`Skipping ${mealType} for user ${userId} - mess closed`);
        continue;
      }
      
      // Check if user already manually booked
      const alreadyBooked = await hasExistingBooking(userId, tomorrow, mealType);
      if (alreadyBooked) {
        console.log(`Skipping ${mealType} for user ${userId} - already booked manually`);
        continue;
      }
      
      // Check if config has this meal type
      if (!config.meals[mealType] || config.meals[mealType].length === 0) {
        console.log(`Skipping ${mealType} - not available in config`);
        continue;
      }
      
      // Create auto-booking
      try {
        const booking = new Booking({
          user: userId,
          date: tomorrow,
          mealType,
          items: mealData.items,
        });
        await booking.save();
        autoBookedCount++;
        console.log(`✅ Auto-booked ${mealType} for user ${userId} on ${tomorrow}`);
      } catch (err) {
        if (err.code !== 11000) { // Not duplicate error
          console.error(`❌ Auto-booking failed for user ${userId}:`, err.message);
        }
      }
    }
  }
  
  console.log(`Auto-booking completed. Created ${autoBookedCount} bookings for ${tomorrow}`);
};