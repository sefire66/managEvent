import mongoose from "mongoose";

const IL_MOBILE_REGEX = /^05\d{8}$/; // נייד ישראלי: 10 ספרות, מתחיל ב-05

const UserSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true }, // חובה לאימות
  phone: {
    type: String,
    validate: {
      validator: (v: string | undefined | null) =>
        v == null || v === "" || IL_MOBILE_REGEX.test(v),
      message: "מספר הטלפון חייב להיות מובייל ישראלי בפורמט 05XXXXXXXX",
    },
  },
  password: { type: String, required: true },
  createdAt: { type: Date, default: Date.now },
  role: { type: String },
  subscriptionType: {
    type: String,
    enum: ["free", "basic", "premium", "enterprise"],
    default: "free",
  },
  smsBalance: {
    type: Number,
    default: 0,
  },
  smsUsed: {
    type: Number,
    default: 0,
  },
  isActive: { type: Boolean, default: true },
  lastLogin: { type: Date },

  // === אימות אימייל ===
  isVerified: { type: Boolean, default: false },
  verifyToken: { type: String, default: null },
  verifyTokenExpiry: { type: Date, default: null },

  // === חדשים ===
  paymentsTotal: { type: Number, default: 0 }, // סה״כ תשלומים
  note: { type: String, default: null }, // הערה חופשית לאדמין
});

export default mongoose.models.User || mongoose.model("User", UserSchema);
