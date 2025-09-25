// models/PasswordResetToken.ts
import mongoose from "mongoose";

const PasswordResetTokenSchema = new mongoose.Schema({
  userEmail: {
    type: String,
    required: true,
    index: true,
    lowercase: true,
    trim: true,
  },
  tokenHash: {
    type: String,
    required: true,
    unique: true,
    index: true,
  },
  expiresAt: {
    type: Date,
    required: true,
    index: true,
  },
  used: {
    type: Boolean,
    default: false,
    index: true,
  },
  requestedIp: { type: String },
  userAgent: { type: String },
  createdAt: { type: Date, default: Date.now },
});

// TTL Index – מסמכים יימחקו אוטומטית אחרי התפוגה
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
