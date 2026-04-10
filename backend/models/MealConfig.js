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

const mealConfigSchema = new mongoose.Schema(
  {
    date: {
      type: String,
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

export default mongoose.model("MealConfig", mealConfigSchema);