import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
  name: String,
  quantity: {
    type: Number,
    default: null,
  },
});

const bookingSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    date: {
      type: String,
      required: true,
    },
    mealType: {
      type: String,
      enum: ["breakfast", "lunch", "dinner"],
      required: true,
    },
    items: [itemSchema],
  },
  { timestamps: true }
);

// prevent duplicate booking (same user + date + meal)
bookingSchema.index({ user: 1, date: 1, mealType: 1 }, { unique: true });

export default mongoose.model("Booking", bookingSchema);