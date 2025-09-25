import mongoose from "mongoose";

const PaymentSchema = new mongoose.Schema(
  {
    /* ליבה קיימת */
    email: { type: String, required: true },
    itemName: { type: String, required: true },
    moneyAmount: { type: Number, required: true }, // ברוטו של העסקה (amountGross)
    transactionId: { type: String, required: true }, // מזהה קנוני לעסקה
    smsAmount: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },

    /* 🆕 סליקה גנרית */
    provider: { type: String, default: null }, // למשל: "invoice4u" | "paypal" | "cardcom" | "manual"
    providerMethod: { type: String, default: null }, // למשל: "credit_card" | "paypal_balance" | "bit"
    providerRefs: {
      type: Map,
      of: String,
      default: undefined, // נשמר רק אם יש
    }, // מזהים חיצוניים גמישים (order_id, capture_id, auth_code וכד')
    status: {
      type: String,
      enum: [
        "pending",
        "authorized",
        "captured",
        "failed",
        "refunded",
        "chargeback",
      ],
      default: "captured", // שמירה על התנהגות עבר (אם תרצה אחרת, שנה כאן)
    },
    currency: { type: String, default: "ILS" },
    providerFee: { type: Number, default: null }, // עמלת הספק
    amountNet: { type: Number, default: null }, // נטו אחרי עמלה

    /* 🆕 שיוכים אופציונליים (לניתוחים/דוחות) */
    requestId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "PaymentRequest",
      default: null,
    },
    eventId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Event",
      default: null,
    },
    ownerUserId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      default: null,
    },

    /* 🆕 פרטי משלם (אם זמינים) */
    payerName: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerPhone: { type: String, default: null },

    /* 🆕 החזרים/קישור עסקה מקורית */
    parentTransactionId: { type: String, default: null }, // לזיכוי/החזר – מצביע על העסקה המקורית

    /* 🆕 טרייסינג ל-webhook/תשובות ספק */
    rawWebhook: { type: mongoose.Schema.Types.Mixed, default: null },

    /* מסמך חשבונאי – קיים אצלך, משאיר כמותאם */
    docType: {
      type: String,
      enum: ["RECEIPT", "TAX_INVOICE_RECEIPT", "TAX_INVOICE", "CREDIT_NOTE"],
      default: null,
    },
    docStatus: {
      type: String,
      enum: ["ISSUED", "PENDING", "FAILED"],
      default: null,
    },
    docProvider: { type: String, default: null }, // invoice4u, icount, …
    docId: { type: String, default: null },
    docUrl: { type: String, default: null },
    docIssuedAt: { type: Date, default: null },

    note: { type: String, default: null },

    /* 🆕 קיבוע מס (סנכרון עם ה-types שלך) */
    appliedBusinessType: {
      type: String,
      enum: ["EXEMPT", "LICENSED"],
      default: null,
    },
    appliedVatRate: { type: Number, default: null }, // למשל 0 או 18
    taxBaseAmount: { type: Number, default: null }, // בסיס לפני מע"מ (למורשה)
    taxAmount: { type: Number, default: null }, // רכיב המע"מ בפועל
  },
  { minimize: false } // נשמור מפות כמו providerRefs גם אם יש מפתח אחד
);

/* אינדקסים מומלצים */
PaymentSchema.index(
  { provider: 1, transactionId: 1 },
  { unique: true, sparse: true }
);
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ ownerUserId: 1 });
PaymentSchema.index({ requestId: 1 });
PaymentSchema.index({ eventId: 1 });

export default mongoose.models.Payment ||
  mongoose.model("Payment", PaymentSchema);
