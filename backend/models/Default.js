import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: {
    type: Number,
    default: null,
  },
});

const defaultSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      unique: true,
    },
    meals: {
      breakfast: {
        enabled: { type: Boolean, default: false },
        items: [itemSchema],
      },
      lunch: {
        enabled: { type: Boolean, default: false },
        items: [itemSchema],
      },
      dinner: {
        enabled: { type: Boolean, default: false },
        items: [itemSchema],
      },
    },
  },
  { timestamps: true }
);

export default mongoose.model("Default", defaultSchema);