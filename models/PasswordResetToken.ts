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
    unique: true, // unique יוצר אינדקס בפני עצמו, אין צורך גם index:true
  },
  expiresAt: {
    type: Date,
    required: true,
    // index: true  ← להסיר כדי לא ליצור כפילות עם ה-TTL למטה
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

// TTL Index – מחיקה אוטומטית אחרי התפוגה (אינדקס יחיד על expiresAt)
PasswordResetTokenSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });

export default mongoose.models.PasswordResetToken ||
  mongoose.model("PasswordResetToken", PasswordResetTokenSchema);
