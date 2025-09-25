// app/types/types.ts

/* ============================
   עסקים/מס
============================ */
export type BusinessType = "EXEMPT" | "LICENSED";

/* ============================
   Payment – רשומת עסקה בפועל
   (מותאם לסכמה המעודכנת)
============================ */
export type PaymentStatus =
  | "pending"
  | "authorized"
  | "captured"
  | "failed"
  | "refunded"
  | "chargeback";

export type AccountingDocType =
  | "RECEIPT"
  | "TAX_INVOICE_RECEIPT"
  | "TAX_INVOICE"
  | "CREDIT_NOTE";

export type AccountingDocStatus = "ISSUED" | "PENDING" | "FAILED";

/** 🔁 רשומת תשלום גנרית – תואמת לסכמה המעודכנת */
export type Payment = {
  _id: string;

  /* קיימים */
  email: string;
  itemName: string;
  moneyAmount: number; // Gross – מה ששולם בפועל
  transactionId: string;
  smsAmount?: number;

  /* 🆕 סליקה גנרית */
  provider?: string | null; // "invoice4u" | "paypal" | "cardcom" | "manual" | ...
  providerMethod?: string | null; // "credit_card" | "paypal_balance" | "bit" | ...
  providerRefs?: Record<string, string>; // order_id, capture_id, auth_code, ...
  status: PaymentStatus;
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

  /* 🆕 החזר/קישור לעסקת מקור (לזיכויים) */
  parentTransactionId?: string | null;

  /* 🆕 trace/debug */
  rawWebhook?: any;

  /* 🧾 מסמך חשבונאי ראשי (לרוב עבור התשלום/המתנה) */
  docType?: AccountingDocType | null;
  docStatus?: AccountingDocStatus | null;
  docProvider?: string | null; // "invoice4u" | "icount" | ...
  docId?: string | null;
  docUrl?: string | null;
  docIssuedAt?: string | null; // ISO

  /* 🧾 מסמך עמלה (כאשר יש עמלת פלטפורמה נפרדת, למשל במתנות add_on) */
  feeDocType?: AccountingDocType | null;
  feeDocStatus?: AccountingDocStatus | null;
  feeDocProvider?: string | null;
  feeDocId?: string | null;
  feeDocUrl?: string | null;
  feeDocIssuedAt?: string | null; // ISO

  /* מס/מע"מ – תואם למה שהגדרת */
  appliedBusinessType?: BusinessType | null;
  appliedVatRate?: number | null; // 0 או 17/18 (לפי המדיניות שלך)
  taxBaseAmount?: number | null; // בסיס לפני מע"מ (למורשה)
  taxAmount?: number | null; // רכיב המע"מ

  /* 🆕 פירוק מתנה/עמלה (לתרחישי gift) */
  giftAmount?: number | null; // כמה מתנה נטו (G)
  platformFeeBase?: number | null; // עמלה לפני מע״מ
  platformFeeVat?: number | null; // מע״מ על העמלה
  platformFeeTotal?: number | null; // עמלה כולל מע״מ

  note?: string | null;
  createdAt: string; // ISO
};

/* ============================
   BillingProfile – ללא שינוי
============================ */
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
  minPayment?: number; // מינימום לתשלום
  createdAt: string; // ISO
};

/* ============================
   PaymentRequest – בקשת תשלום/מתנה
   איחוד מבחין בין "payment" ל-"gift"
============================ */
export type PaymentRequestStatus =
  | "draft"
  | "active"
  | "paid"
  | "expired"
  | "canceled";

export type PaymentRequestType = "payment" | "gift";

export type FeeMode = "included" | "add_on";
export type SentChannel = "sms" | "email" | "manual" | null;

/* ספקי תשלום/חשבוניות נתמכים */
export type ProviderName =
  | "invoice4u"
  | "paypal"
  | "cardcom"
  | "manual"
  | "icount";

/** בסיס משותף לשני הסוגים */
export type PaymentRequestBase = {
  _id: string;
  ownerUserId: string;
  eventId?: string | null;

  /* חדש: סוג עוסק */
  businessType: BusinessType;

  /* סוג הבקשה */
  type: PaymentRequestType;

  /* מטבע */
  currency: string;

  /* תוכן תצוגה */
  title: string;
  description?: string | null;
  imageUrl?: string | null;

  /* אבטחה/קישור */
  token: string;
  shortUrl?: string | null; // ← כאן נשמר ה-HostedPageUrl של Invoice4U
  qrUrl?: string | null;

  /* תוקף/שימוש */
  expiresAt?: string | null; // ISO
  usageLimit: number;
  uses: number;

  /* סטטוס */
  status: PaymentRequestStatus;

  /* Redirects */
  redirectSuccessUrl?: string | null;
  redirectCancelUrl?: string | null;

  /* שליחה/לוג */
  lastSentAt?: string | null; // ISO
  sentChannel?: SentChannel;
  sentCount: number;

  /* 👤 פרטי משלם (אופציונלי) — חדש */
  payerName?: string | null;
  payerEmail?: string | null;
  payerPhone?: string | null;

  /* 🧾 ספק — מזהים/מסמכים — חדש */
  provider?: ProviderName | null; // "invoice4u" כרגע
  providerTransactionId?: string | null; // Transaction/Deal/Payment Id
  providerDocId?: string | null; // מזהה מסמך אצל הספק
  providerDocNumber?: string | null; // מספר מסמך קריא

  /* 🕒 מועד תשלום בפועל — חדש */
  paidAt?: string | null; // ISO

  /* יצירה */
  createdAt: string; // ISO
  createdBy: string;
};

/** בקשת תשלום רגילה – סכום קבוע חובה */
export type PaymentRequestPayment = PaymentRequestBase & {
  type: "payment";
  amount: number; // חובה

  vatAmount?: number | null;
  minAmount?: number | null; // רשות אם type=gift
  vatRate?: number;

  /* במצב תשלום אין צורך בשדות עמלה */
  feeMode?: never;
  feeFixed?: never;
  feePercent?: never;
  // vatRateForFee?: never;
  showFeeBreakdown?: never;
};

/** בקשת מתנה – סכום פתוח (אפשר גם להגדיר מינימום) + עמלות */
export type PaymentRequestGift = PaymentRequestBase & {
  type: "gift";
  amount?: number | null; // רשות (אפשר להשאיר פתוח)
  minAmount?: number | null; // מינימום לתשלום פתוח

  /* עמלות (ברירת מחדל add_on) */
  feeMode?: FeeMode; // "add_on" | "included"
  feeFixed?: number; // ברירת מחדל 0
  feePercent?: number; // בין 0 ל-1 (למשל 0.05 = 5%)
  // vatRateForFee?: number; // אם לא מוגדר – מה-BillingProfile
  showFeeBreakdown?: boolean; // ברירת מחדל true
};

/** איחוד סופי לייצוא */
export type PaymentRequest = PaymentRequestPayment | PaymentRequestGift;

/* ============================
   User / Guest / Event / UI
============================ */

/* types (רק הקטע של User) */
export type User = {
  _id: string;
  name: string;
  email: string;
  phone?: string; // ← טלפון אופציונלי לצד הלקוח
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
  eventId?: string; // ✅ מזהה האירוע
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
