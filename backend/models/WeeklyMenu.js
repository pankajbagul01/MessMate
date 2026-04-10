import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: String,
  hasQuantity: {
    type: Boolean,
    default: false,
  },
  maxQuantity: {
    type: Number,
    default: null,
  },
});

const weeklyMenuSchema = new mongoose.Schema(
  {
    dayOfWeek: {
      type: String,
      enum: ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"],
      required: true,
      unique: true,
    },
    meals: {
      breakfast: [itemSchema],
      lunch: [itemSchema],
      dinner: [itemSchema],
    },
  },
  { timestamps: true }
);

export default mongoose.model("WeeklyMenu", weeklyMenuSchema);