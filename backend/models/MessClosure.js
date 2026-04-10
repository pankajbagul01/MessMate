import mongoose from "mongoose";

const messClosureSchema = new mongoose.Schema(
  {
    date: {
      type: String,
      required: true,
      unique: true,
    },
    reason: {
      type: String,
      default: "Mess closed",
    },
    affectedMeals: {
      type: [String],
      enum: ["breakfast", "lunch", "dinner"],
      default: ["breakfast", "lunch", "dinner"],
    },
  },
  { timestamps: true }
);

export default mongoose.model("MessClosure", messClosureSchema);