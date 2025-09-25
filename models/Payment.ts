// models/payment.ts
import mongoose, { Schema, Document, Model } from "mongoose";

/** טיפוסי עזר */
export type BusinessType = "EXEMPT" | "LICENSED";
export type AccountingDocType =
  | "RECEIPT"
  | "TAX_INVOICE_RECEIPT"
  | "TAX_INVOICE"
  | "CREDIT_NOTE";
export type AccountingDocStatus = "ISSUED" | "PENDING" | "FAILED";
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "chargeback";

/** המסמך של Mongoose (DB) */
export interface PaymentDoc extends Document {
  /** ליבה */
  email: string;
  itemName: string;
  moneyAmount: number; // Gross paid (אפשר גם לקרוא amountGross)
  transactionId: string;
  smsAmount?: number | null;
  createdAt: Date;

  /** סליקה גנרית */
  provider?: string | null; // invoice4u | paypal | cardcom | manual | ...
  providerMethod?: string | null; // credit_card | paypal_balance | bit | ...
  providerRefs?: Record<string, string>; // order_id, capture_id, auth_code, ...
  status: PaymentStatus; // ברירת מחדל: "captured" לשמירה על התנהגות עבר
  currency?: string; // ברירת מחדל: "ILS"
  providerFee?: number | null; // עמלת הספק
  amountNet?: number | null; // נטו אחרי עמלה

  /** שיוכים אופציונליים */
  requestId?: mongoose.Types.ObjectId | null;
  eventId?: mongoose.Types.ObjectId | null;
  ownerUserId?: mongoose.Types.ObjectId | null;

  /** פרטי משלם */
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;

  /** החזרים/קישור לעסקת מקור */
  parentTransactionId?: string | null;

  /** Trace/Webhook גולמי */
  rawWebhook?: any;

  /** מסמך חשבונאי ראשי (לרוב עבור תשלום/מתנה) */
  docType?: AccountingDocType | null;
  docStatus?: AccountingDocStatus | null;
  docProvider?: string | null; // invoice4u | icount | ...
  docId?: string | null;
  docUrl?: string | null;
  docIssuedAt?: Date | null;

  /** סט מסמך נפרד לעמלת פלטפורמה (אם רלוונטי במתנות add_on) */
  feeDocType?: AccountingDocType | null;
  feeDocStatus?: AccountingDocStatus | null;
  feeDocProvider?: string | null;
  feeDocId?: string | null;
  feeDocUrl?: string | null;
  feeDocIssuedAt?: Date | null;

  /** קיבוע מס בעת עסקה (תואם לטייפים שלך) */
  appliedBusinessType?: BusinessType | null;
  appliedVatRate?: number | null; // 0 או 17/18
  taxBaseAmount?: number | null; // בסיס לפני מע״מ (למורשה)
  taxAmount?: number | null; // רכיב מע״מ בפועל

  /** פירוק מתנה/עמלה (אם משתמשים במתנות) */
  giftAmount?: number | null; // סכום המתנה נטו
  platformFeeBase?: number | null; // עמלה לפני מע״מ
  platformFeeVat?: number | null; // מע״מ על העמלה
  platformFeeTotal?: number | null; // עמלה כולל מע״מ

  /** כללי */
  note?: string | null;
}

const PaymentSchema = new Schema<PaymentDoc>(
  {
    /** ליבה קיימת */
    email: { type: String, required: true },
    itemName: { type: String, required: true },
    moneyAmount: { type: Number, required: true }, // Gross: מה ששולם בפועל
    transactionId: { type: String, required: true },
    smsAmount: { type: Number, default: null },
    createdAt: { type: Date, default: Date.now },

    /** סליקה גנרית */
    provider: { type: String, default: null },
    providerMethod: { type: String, default: null },
    providerRefs: {
      type: Map,
      of: String,
      default: undefined, // נשמר רק אם קיים
    },
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
      default: "captured", // לשמור על תאימות קיימת; אפשר לשנות ל"pending" בזרימה חדשה
    },
    currency: { type: String, default: "ILS" },
    providerFee: { type: Number, default: null },
    amountNet: { type: Number, default: null },

    /** שיוכים אופציונליים */
    requestId: {
      type: Schema.Types.ObjectId,
      ref: "PaymentRequest",
      default: null,
    },
    eventId: { type: Schema.Types.ObjectId, ref: "Event", default: null },
    ownerUserId: { type: Schema.Types.ObjectId, ref: "User", default: null },

    /** פרטי משלם */
    payerName: { type: String, default: null },
    payerEmail: { type: String, default: null },
    payerPhone: { type: String, default: null },

    /** החזרים/קישור לעסקת מקור */
    parentTransactionId: { type: String, default: null },

    /** Trace/Webhook גולמי */
    rawWebhook: { type: Schema.Types.Mixed, default: null },

    /** מסמך חשבונאי ראשי */
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
    docProvider: { type: String, default: null }, // invoice4u, icount, ...
    docId: { type: String, default: null },
    docUrl: { type: String, default: null },
    docIssuedAt: { type: Date, default: null },

    /** מסמך עמלה (אם רלוונטי) */
    feeDocType: {
      type: String,
      enum: ["RECEIPT", "TAX_INVOICE_RECEIPT", "TAX_INVOICE", "CREDIT_NOTE"],
      default: null,
    },
    feeDocStatus: {
      type: String,
      enum: ["ISSUED", "PENDING", "FAILED"],
      default: null,
    },
    feeDocProvider: { type: String, default: null },
    feeDocId: { type: String, default: null },
    feeDocUrl: { type: String, default: null },
    feeDocIssuedAt: { type: Date, default: null },

    /** קיבוע מס בעת העסקה */
    appliedBusinessType: {
      type: String,
      enum: ["EXEMPT", "LICENSED"],
      default: null,
    },
    appliedVatRate: { type: Number, default: null },
    taxBaseAmount: { type: Number, default: null },
    taxAmount: { type: Number, default: null },

    /** פירוק מתנה/עמלה – אם משתמשים במתנות */
    giftAmount: { type: Number, default: null },
    platformFeeBase: { type: Number, default: null },
    platformFeeVat: { type: Number, default: null },
    platformFeeTotal: { type: Number, default: null },

    /** כללי */
    note: { type: String, default: null },
  },
  { minimize: false } // שומר מפות (providerRefs) גם אם יש מפתח יחיד
);

/** אינדקסים מומלצים */
PaymentSchema.index(
  { provider: 1, transactionId: 1 },
  { unique: true, sparse: true }
);
PaymentSchema.index({ createdAt: -1 });
PaymentSchema.index({ status: 1 });
PaymentSchema.index({ ownerUserId: 1 });
PaymentSchema.index({ requestId: 1 });
PaymentSchema.index({ eventId: 1 });

const PaymentModel: Model<PaymentDoc> =
  mongoose.models.Payment ||
  mongoose.model<PaymentDoc>("Payment", PaymentSchema);

export default PaymentModel;
