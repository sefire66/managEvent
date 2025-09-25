import mongoose from "mongoose";

const CHECKOUT_PROVIDERS = [
  "invoice4u",
  "paypal",
  "cardcom",
  "upay",
  "manual",
] as const;

const BillingProfileSchema = new mongoose.Schema(
  {
    ownerEmail: { type: String, required: true },

    // 🆕 שם רשמי לפי הרשמה במס הכנסה/מע״מ/ביטוח לאומי
    legalName: { type: String, required: true },

    // שם עסקי/מותג (למשל "ניהול אירועים")
    businessName: { type: String, required: true },

    businessId: { type: String, required: true }, // ת"ז או ח.פ.
    businessType: {
      type: String,
      enum: ["EXEMPT", "LICENSED"],
      required: true,
    },

    // שיעור מע״מ ברמת הפרופיל (למורשה - לדוגמה 17/18; לפטור 0)
    vatRate: { type: Number, default: 0 },

    address: { type: String, default: null },
    phone: { type: String, default: null },

    // ====== בחירת ספק סליקה ברירת מחדל לפרופיל זה ======
    // דיפולט לבקשות תשלום חדשות של הלקוח הזה (אם לא נבחר ידנית בבקשה)
    defaultCheckoutProvider: {
      type: String,
      enum: CHECKOUT_PROVIDERS,
      default: "invoice4u",
    },

    minPayment: { type: Number, default: 0 },
    // רשימת ספקים מותרים ללקוח זה (לסינון בבורר ה־UI). אם ריק — כל הספקים הפעילים במערכת.
    allowedCheckoutProviders: [
      {
        type: String,
        enum: CHECKOUT_PROVIDERS,
      },
    ],

    // סימון פרופיל כברירת מחדל כאשר יש ללקוח כמה פרופילים
    isDefault: { type: Boolean, default: false },

    // תאריך שימוש אחרון (עוזר לבחור אוטומטית כשיש כמה)
    lastUsedAt: { type: Date, default: null },

    // מטא
    createdAt: { type: Date, default: Date.now },
    note: { type: String, default: null },
  },
  { minimize: false }
);

// אינדקסים שימושיים
BillingProfileSchema.index({ ownerEmail: 1 });
BillingProfileSchema.index({ isDefault: -1, lastUsedAt: -1, createdAt: -1 });

export default mongoose.models.BillingProfile ||
  mongoose.model("BillingProfile", BillingProfileSchema);
