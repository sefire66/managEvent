// app/types/types.ts

export type BusinessType = "EXEMPT" | "LICENSED";

/** 🔁 רשומת תשלום גנרית – תואמת לסכמה המעודכנת */
export type Payment = {
  _id: string;

  /* קיימים */
  email: string;
  itemName: string;
  moneyAmount: number; // Gross
  transactionId: string;
  smsAmount?: number;

  /* 🆕 סליקה גנרית */
  provider?: string | null; // "invoice4u" | "paypal" | "cardcom" | "manual" | ...
  providerMethod?: string | null; // "credit_card" | "paypal_balance" | "bit" | ...
  providerRefs?: Record<string, string>; // order_id, capture_id, auth_code, ...
  status:
    | "pending"
    | "authorized"
    | "captured"
    | "failed"
    | "refunded"
    | "chargeback";
  currency?: string; // ברירת מחדל ILS
  providerFee?: number | null;
  amountNet?: number | null;

  /* 🆕 שיוכים (אופציונלי) */
  requestId?: string | null;
  eventId?: string | null;
  ownerUserId?: string | null;

  /* 🆕 פרטי משלם (אם זמינים) */
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;

  /* 🆕 החזר/קישור לעסקת מקור */
  parentTransactionId?: string | null;

  /* 🆕 trace */
  rawWebhook?: any;

  /* 🧾 מסמך חשבונאי (כבר היה אצלך) */
  docType?:
    | "RECEIPT"
    | "TAX_INVOICE_RECEIPT"
    | "TAX_INVOICE"
    | "CREDIT_NOTE"
    | null;
  docStatus?: "ISSUED" | "PENDING" | "FAILED" | null;
  docProvider?: string | null; // "invoice4u" | "icount" | ...
  docId?: string | null;
  docUrl?: string | null;
  docIssuedAt?: string | null; // ISO

  /* מס/מע"מ – תואם למה שהגדרת */
  appliedBusinessType?: BusinessType | null;
  appliedVatRate?: number | null; // 0 או 18 (לפי המדיניות שלך)
  taxBaseAmount?: number | null;
  taxAmount?: number | null;

  note?: string | null;
  createdAt: string; // ISO
};

/* BillingProfile ויתר הטייפים שלך – ללא שינוי */
export type BillingProfile = {
  _id: string;
  ownerEmail: string;
  legalName: string;
  businessName: string;
  businessId: string;
  businessType: BusinessType;
  vatRate: number;
  address?: string;
  phone?: string;
  note?: string;
  createdAt: string; // ISO
};
// ===========================================
/* PaymentRequest – תואם לסכמה המעודכנת */

export type PaymentRequestStatus =
  | "draft"
  | "active"
  | "paid"
  | "expired"
  | "canceled";

export type PaymentRequestType = "gift" | "service" | "deposit" | "open_amount";

export type FeeMode = "included" | "add_on";

export type SentChannel = "sms" | "email" | "manual" | null;

export type PaymentRequest = {
  _id: string;
  ownerUserId: string;
  eventId?: string | null;

  type: PaymentRequestType;

  // 💰 כספים
  amount?: number | null;
  minAmount?: number | null;
  currency: string; // למשל "ILS"

  // 📝 תיאור
  title: string;
  description?: string | null;
  imageUrl?: string | null;

  // 🔒 אבטחה
  token: string;
  shortUrl?: string | null;
  qrUrl?: string | null;
  expiresAt?: string | null; // ISO
  usageLimit: number;
  uses: number;

  // ⚙️
  feeMode: FeeMode;

  // 📌 סטטוס
  status: PaymentRequestStatus;

  // ↪️ Redirects
  redirectSuccessUrl?: string | null;
  redirectCancelUrl?: string | null;

  // 📨 שליחה
  lastSentAt?: string | null; // ISO
  sentChannel?: SentChannel;
  sentCount: number;

  createdAt: string; // ISO
  createdBy: string;
};
// ===========================================
/* end  PaymentRequest */
// ============================================
/* User/Guest/... לא שיניתי כאן */

// types (רק הקטע של User)
export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string; // ← חדש: טלפון אופציונלי לצד הלקוח
  role: string;
  subscriptionType: "free" | "basic" | "premium" | "enterprise";
  smsBalance: number;
  smsUsed: number;
  isActive: boolean;
  lastLogin: Date | null;
  isVerified: boolean;
  paymentsTotal: number; // סה״כ תשלומים
  note?: string; // הערה חופשית לאדמין
};

export type Guest = {
  _id: string;
  phone: string;
  name: string;
  status: "לא ענה" | "בא" | "לא בא" | "אולי";
  table: string;
  count: number | undefined;
  smsCount: number;
  lastSms: string;
  eventId?: string; // ✅ add this line
};

export type GuestWithValidation = Guest & {
  isInvalid?: boolean;
  isDuplicate?: boolean;
};
export type EventPreferences = {
  hideDetails: boolean;
  imageRatio: "auto" | "16:9" | "4:3";
  version?: number; // אופציונלי להצגה בלבד
  updatedAt?: string; // מחרוזת ISO שתגיע מהשרת
};

export type EventDetails = {
  _id?: string;
  brideFirst: string;
  brideLast: string;
  groomFirst: string;
  groomLast: string;
  date: string;
  time: string;
  venue: string;
  address: string;
  eventType?: string;
  ownerEmail?: string;
  imageUrl?: string;
  imagePath?: string;
  googleMapsLink?: string;
  wazeLink?: string;
  isCanceled?: boolean;
  cancelReason?: string;

  // ← חדש: העדפות RSVP מקוננות
  preferences?: EventPreferences;
};

export type InputBoxProps = {
  name: string;
  titleName: string;
  value?: string;
  onChange?: React.ChangeEventHandler<HTMLInputElement>;
  placeholder?: string;
  type?: React.HTMLInputTypeAttribute;
  readOnly?: boolean;
  required?: boolean;
  showError?: boolean;
  min?: string | number; // ← חדש (ל-date/number)
  max?: string | number; // אופציונלי
  step?: string | number; // אופציונלי
  dir?: "ltr" | "rtl" | "auto"; // אופציונלי
  autoComplete?: string; // אופציונלי
  onBlur?: React.FocusEventHandler<HTMLInputElement>; // ← חדש
};

export type Table = {
  number: string;
  totalSeats: number;
  note?: string;
  eventId?: string; // ✅ חדש - מזהה האירוע
};
