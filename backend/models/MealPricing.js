import mongoose from "mongoose";

// Stores the price per meal type set by admin
// Only one document exists (singleton) — upserted by date range or a global config
const mealPricingSchema = new mongoose.Schema(
  {
    breakfast: { type: Number, required: true, default: 0 },
    lunch:     { type: Number, required: true, default: 0 },
    dinner:    { type: Number, required: true, default: 0 },
    // optional: per-item overrides can be added later
    updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model("MealPricing", mealPricingSchema);