import mongoose from "mongoose";

// One record per student per month — tracks payment status
const feeRecordSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    year:  { type: Number, required: true },
    month: { type: Number, required: true }, // 1–12

    // Snapshot of meal counts at time of calculation
    breakfastCount: { type: Number, default: 0 },
    lunchCount:     { type: Number, default: 0 },
    dinnerCount:    { type: Number, default: 0 },
    totalMeals:     { type: Number, default: 0 },

    // Snapshot of prices at time of calculation
    breakfastRate: { type: Number, default: 0 },
    lunchRate:     { type: Number, default: 0 },
    dinnerRate:    { type: Number, default: 0 },

    totalAmount: { type: Number, default: 0 },

    paid:   { type: Boolean, default: false },
    paidAt: { type: Date,    default: null  },
    paidBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", default: null },

    notes: { type: String, default: "" },
  },
  { timestamps: true }
);

// One record per student per month
feeRecordSchema.index({ user: 1, year: 1, month: 1 }, { unique: true });

export default mongoose.model("FeeRecord", feeRecordSchema);