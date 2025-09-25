// models/PaymentRequest.ts
import mongoose, { Schema, Document, Model } from "mongoose";

/** חדש: טיפוס סוג עוסק */
export type BusinessType = "EXEMPT" | "LICENSED";

export type PaymentRequestType = "payment" | "gift";
export type PaymentRequestStatus =
  | "draft"
  | "active"
  | "paid"
  | "expired"
  | "canceled";
export type FeeMode = "included" | "add_on";
export type SentChannel = "sms" | "email" | "manual" | null;

/**
 * הרחבות לסכמה:
 * - provider, providerTransactionId, providerDocId, providerDocNumber — מזהי ספק (Invoice4U)
 * - payerName, payerEmail, payerPhone — פרטי משלם לצורך שליחה/זיהוי
 * - paidAt — מועד תשלום בפועל (מועיל בסטטוסים / דוחות)
 */
export interface PaymentRequestDoc extends Document {
  ownerUserId: mongoose.Types.ObjectId;
  eventId?: mongoose.Types.ObjectId | null;

  /** 💼 סוג העוסק (פטור/מורשה) */
  businessType: BusinessType;

  type: PaymentRequestType;

  /** 💰 כספים */
  amount?: number | null;
  vatAmount?: number | null;
  minAmount?: number | null;
  vatRate?: number;
  currency: string;

  /** 📝 תוכן */
  title: string;
  description?: string | null;
  imageUrl?: string | null;

  /** 🔒 אבטחה ותוקף */
  token: string;
  shortUrl?: string | null; // נשתמש בזה לשמירת HostedPageUrl מהספק
  qrUrl?: string | null;
  expiresAt?: Date | null;
  usageLimit: number;
  uses: number;

  /** ⚙️ עמלות */
  feeMode: FeeMode;
  feeFixed?: number;
  feePercent?: number;
  showFeeBreakdown: boolean;

  /** 📌 סטטוס */
  status: PaymentRequestStatus;

  /** ↪️ Redirects */
  redirectSuccessUrl?: string | null;
  redirectCancelUrl?: string | null;

  /** 📨 לוג שליחה */
  lastSentAt?: Date | null;
  sentChannel?: SentChannel;
  sentCount: number;

  /** 🧾 ספק/מסמכים (Invoice4U) */
  provider?: string | null; // למשל: "invoice4u"
  providerTransactionId?: string | null; // מזהה עסקה/טרנזקציה מהספק
  providerDocId?: string | null; // מזהה מסמך אצל הספק (אם נוצר)
  providerDocNumber?: string | null; // מספר מסמך קריא (אם נוצר)

  /** 👤 פרטי משלם (אופציונלי לשמירה אצלנו) */
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;

  /** 🕒 מועד תשלום בפועל (אם שולם) */
  paidAt?: Date | null;

  /** יצירה */
  createdAt: Date;
  createdBy: mongoose.Types.ObjectId;
}

const PaymentRequestSchema = new Schema<PaymentRequestDoc>(
  {
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", required: true },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null },

    /** 💼 סוג העוסק */
    businessType: {
      type: String,
      enum: ["EXEMPT", "LICENSED"],
      required: true,
      default: "EXEMPT",
    },

    type: {
      type: String,
      enum: ["payment", "gift"],
      required: true,
      default: "payment",
    },

    /** 💰 כספים */
    amount: {
      type: Number,
      required: function (this: PaymentRequestDoc) {
        return this.type === "payment";
      },
      min: [1, "Amount must be at least 1 ILS"],
      default: null,
    },
    minAmount: {
      type: Number,
      min: [1, "Minimum amount must be at least 1 ILS"],
      default: null,
    },

    vatAmount: { type: Number, default: 0 },
    vatRate: { type: Number, default: 0 },

    currency: { type: String, default: "ILS" },

    /** 📝 תוכן */
    title: { type: String, required: true },
    description: { type: String, default: null },
    imageUrl: { type: String, default: null },

    /** 🔒 אבטחה ותוקף */
    token: { type: String, required: true, unique: true },
    shortUrl: { type: String, default: null }, // ישמש ל-HostedPageUrl מהספק
    qrUrl: { type: String, default: null },
    expiresAt: { type: Date, default: null },
    usageLimit: { type: Number, default: 1 },
    uses: { type: Number, default: 0 },

    /** ⚙️ עמלות */
    feeMode: { type: String, enum: ["included", "add_on"], default: "add_on" },
    feeFixed: { type: Number, default: 0 },
    feePercent: { type: Number, default: 0 },
    showFeeBreakdown: { type: Boolean, default: true },

    /** 📌 סטטוס */
    status: {
      type: String,
      enum: ["draft", "active", "paid", "expired", "canceled"],
      default: "draft",
    },

    /** ↪️ Redirects */
    redirectSuccessUrl: { type: String, default: null },
    redirectCancelUrl: { type: String, default: null },

    /** 📨 לוג שליחה */
    lastSentAt: { type: Date, default: null },
    sentChannel: {
      type: String,
      enum: ["sms", "email", "manual", null],
      default: null,
    },
    sentCount: { type: Number, default: 0 },

    /** 🧾 ספק/מסמכים */
    provider: { type: String, default: null }, // "invoice4u"
    providerTransactionId: { type: String, default: null, index: true },
    providerDocId: { type: String, default: null },
    providerDocNumber: { type: String, default: null },

    /** 👤 פרטי משלם */
    payerName: { type: String, default: null },
    payerEmail: { type: String, default: null, index: true },
    payerPhone: { type: String, default: null },

    /** 🕒 תאריך תשלום */
    paidAt: { type: Date, default: null },

    /** יצירה */
    createdAt: { type: Date, default: Date.now },
    createdBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { minimize: false }
);

/** אינדקסים */
PaymentRequestSchema.index({ ownerUserId: 1 });
PaymentRequestSchema.index({ eventId: 1 });
PaymentRequestSchema.index({ status: 1 });
PaymentRequestSchema.index({ createdAt: -1 });
// אינדקסים שימושיים לניתוח ושליפות:
PaymentRequestSchema.index({ provider: 1, providerTransactionId: 1 });
// PaymentRequestSchema.index({ payerEmail: 1 });

const PaymentRequestModel: Model<PaymentRequestDoc> =
  mongoose.models.PaymentRequest ||
  mongoose.model<PaymentRequestDoc>("PaymentRequest", PaymentRequestSchema);

export default PaymentRequestModel;
