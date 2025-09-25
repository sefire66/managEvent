import mongoose from "mongoose";

const packageSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      unique: true,
      enum: ["free", "basic", "premium", "enterprise"],
    },
    price: {
      type: Number,
      required: true,
    },
    smsAmount: {
      type: Number,
      required: true,
    },
  },
  { timestamps: true }
);

export default mongoose.models.Package ||
  mongoose.model("Package", packageSchema);
