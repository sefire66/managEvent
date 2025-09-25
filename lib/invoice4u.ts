/**
 * lib/invoice4u.ts — REST only (ללא SOAP)
 * Endpoints לדוגמה (Postman):
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/VerifyLogin
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/CreateDocument
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/SendDocumentByMail
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/ProcessApiRequestV2
 */

const I4U_BASE = (
  process.env.I4U_BASE || "https://api.invoice4u.co.il/Services/ApiService.svc"
).replace(/\/+$/, "");

const I4U_EMAIL = process.env.I4U_EMAIL!;
const I4U_PASSWORD = process.env.I4U_PASSWORD!;

let _token: string | null = null;
let _tokenAt = 0;

/** תאריך בפורמט WCF: /Date(ms+TZ)/ */
export function i4uDate(date: Date = new Date()) {
  const ms = date.getTime();
  const tzMin = -date.getTimezoneOffset();
  const sign = tzMin >= 0 ? "+" : "-";
  const hh = String(Math.floor(Math.abs(tzMin) / 60)).padStart(2, "0");
  const mm = String(Math.abs(tzMin) % 60).padStart(2, "0");
  return `/Date(${ms}${sign}${hh}${mm})/`;
}

/** POST JSON ל-Invoice4U (עם לוג שגיאות ידידותי) */
async function i4uPost<T = any>(path: string, body: any): Promise<T> {
  const url = `${I4U_BASE}/${path.replace(/^\/+/, "")}`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    // ב־REST שלהם ה־token (אם יש) נשלח כחלק מה-BODY ולא בכותרת
    body: JSON.stringify(body ?? {}),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as T;
  } catch {
    return text as unknown as T; // לעיתים מוחזר GUID/טקסט גולמי
  }
}

/** ייצוא עזר כללי לשימוש מ-route */
export async function callInvoice4U<T = any>(path: string, body: any) {
  return i4uPost<T>(path, body);
}

/** money2 — עיגול סכום לשתי ספרות כמחרוזה */
export function money2(n: number): string {
  const x = Math.round((Number(n) || 0) * 100) / 100;
  return x.toFixed(2);
}

/** טיפוס הבקשה ל-ProcessApiRequestV2 לפי הדוקומנטציה (מספרים/בוליאנים אמיתיים) */
export type ProcessApiV2Request = {
  request: {
    Invoice4UUserApiKey: string;
    Type: number; // 1=Regular, 2=Payments, 3=CreditPayments, 4=Refund
    CreditCardCompanyType?: number; // 6=UPay, 7=Meshulam, 12=Yaad Sarig
    CustomerId?: number;

    IsAutoCreateCustomer?: boolean;
    FullName: string;
    Phone: string;
    Email: string;

    Sum: number; // double
    Description?: string;
    PaymentsNum: number; // int
    Currency: string; // "ILS"
    OrderIdClientUsage?: string;

    // יצירת מסמך (אופציונלי)
    IsDocCreate?: boolean;
    DocHeadline?: string;
    DocComments?: string;
    IsManualDocCreationsWithParams?: boolean;

    // פריטים (במוד ידני — מחרוזות עם מפריד |; לרשומה אחת אפשר ערך בודד)
    DocItemQuantity?: string;
    DocItemPrice?: string; // נטו לשורה, "85.47"
    DocItemTaxRate?: string; // "17"
    IsItemsBase64Encoded?: boolean;
    DocItemName?: string;

    IsGeneralClient?: boolean;

    // קישורים
    ReturnUrl?: string;
    CallBackUrl?: string;

    // דגלים נוספים
    AddToken?: boolean;
    AddTokenAndCharge?: boolean;
    ChargeWithToken?: boolean;
    Refund?: boolean;
    IsStandingOrderClearance?: boolean;
    StandingOrderDuration?: number;

    // Bit
    IsBitPayment?: boolean;
  };
};

/** שליפת טוקן ל-REST (VerifyLogin) */
export async function getInvoice4uToken(): Promise<string> {
  const now = Date.now();
  if (_token && now - _tokenAt < 20 * 60_000) return _token;

  if (!I4U_EMAIL || !I4U_PASSWORD) {
    throw new Error("Missing I4U_EMAIL / I4U_PASSWORD environment vars");
  }

  const raw = await i4uPost<any>("VerifyLogin", {
    email: I4U_EMAIL,
    password: I4U_PASSWORD,
  });

  const token =
    (typeof raw === "string" ? raw : null) ||
    raw?.d ||
    raw?.VerifyLoginResult ||
    raw?.token ||
    null;

  if (!token || typeof token !== "string") {
    console.error("VerifyLogin unexpected response:", raw);
    throw new Error(
      "VerifyLogin failed: no token returned (בדוק אימייל/סיסמה, והרשאת API פעילה)"
    );
  }

  _token = token;
  _tokenAt = now;
  return token;
}

export function resetInvoice4uCache() {
  _token = null;
  _tokenAt = 0;
}

/** בדיקת טוקן (לא חובה) */
export async function isAuthenticated(token?: string) {
  const tk = token || (await getInvoice4uToken());
  const raw = await i4uPost<any>("IsAuthenticated", { token: tk });
  if (typeof raw === "boolean") return raw;
  return !!raw?.d;
}

/** עזר: חילוץ תוצאה בסיסית אחרי יצירת מסמך (לא חובה לזרימה הנוכחית) */
function normalizeCreateDocumentResult(raw: any) {
  const payload =
    (raw && raw.d) ||
    raw?.CreateDocumentResult ||
    raw?.createDocumentResult ||
    raw;

  const docId =
    payload?.ID ||
    payload?.Id ||
    payload?.id ||
    payload?.DocumentId ||
    payload?.documentId ||
    null;

  const docNumber =
    payload?.DocumentNumber ||
    payload?.Number ||
    payload?.number ||
    payload?.DocNumber ||
    null;

  const docUrl =
    payload?.PrintOriginalPDFLink || payload?.PrintCertifiedCopyPDFLink || null;

  return { raw, docId, docNumber, docUrl };
}

/** מיפוי טיפוס תשלום בסיסי — 3=העברה/אחר, 4=אשראי/פייפאל (עזר למסמכים) */
function resolvePaymentType(
  paymentTypeOverride?: number | null,
  provider?: string | null,
  providerMethod?: string | null
): 3 | 4 {
  if (paymentTypeOverride === 3 || paymentTypeOverride === 4)
    return paymentTypeOverride;
  const p = (provider || "").toLowerCase();
  const m = (providerMethod || "").toLowerCase();
  if (p.includes("paypal") || m.includes("credit") || m.includes("card"))
    return 4;
  return 3;
}

/** עיגול לשתי ספרות (כספים) */
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/**
 * (עזר למסמכים בלבד) — יצירת קבלה (DocumentType=2)
 */
export async function createReceipt(args: {
  amount: number;
  currency?: string;
  itemName?: string;
  buyerName?: string;
  buyerEmail?: string;
  notes?: string;
  externalTransactionId?: string;
  provider?: string | null;
  providerMethod?: string | null;
  paymentTypeOverride?: 3 | 4;
  clientId?: number;
}) {
  const token = await getInvoice4uToken();

  if (!(args.amount > 0)) {
    throw new Error("createReceipt: amount must be > 0");
  }

  const amount = round2(args.amount);
  const paymentType = resolvePaymentType(
    args.paymentTypeOverride,
    args.provider ?? null,
    args.providerMethod ?? null
  );

  const baseDoc: any = {
    DocumentType: 2,
    Subject: args.itemName || "Receipt",
    Currency: args.currency || "ILS",
    Payments: [
      {
        Date: i4uDate(new Date()),
        Amount: amount,
        PaymentType: paymentType,
      },
    ],
    ...(args.buyerEmail
      ? { AssociatedEmails: [{ Mail: args.buyerEmail, IsUserMail: false }] }
      : {}),
    ...(args.externalTransactionId
      ? { ApiIdentifier: args.externalTransactionId }
      : {}),
  };

  if (args.clientId && args.clientId > 0) {
    baseDoc.ClientID = args.clientId;
  } else {
    baseDoc.GeneralCustomer = {
      Name: args.buyerName || "General Customer",
    };
  }

  if (args.notes) baseDoc.ExternalComments = String(args.notes);

  const raw = await i4uPost<any>("CreateDocument", { doc: baseDoc, token });
  return normalizeCreateDocumentResult(raw);
}

/**
 * (עזר למסמכים בלבד) — יצירת חשבונית/חשבונית־קבלה (DocumentType=1 או 3)
 */
export async function createTaxInvoice(args: {
  amount: number;
  currency?: string;
  itemName?: string;
  buyerName?: string;
  buyerEmail?: string;
  vatRate?: number;
  externalTransactionId?: string;
  provider?: string | null;
  providerMethod?: string | null;
  paymentTypeOverride?: 3 | 4;
  docType?: "Invoice" | "InvoiceReceipt";
  clientId?: number;
}) {
  const token = await getInvoice4uToken();

  if (!(args.amount > 0)) {
    throw new Error("createTaxInvoice: amount must be > 0");
  }

  const amount = round2(args.amount);
  const paymentType = resolvePaymentType(
    args.paymentTypeOverride,
    args.provider ?? null,
    args.providerMethod ?? null
  );

  const isInvoiceReceipt = args.docType === "InvoiceReceipt";
  const vatPct =
    typeof args.vatRate === "number"
      ? args.vatRate > 1
        ? args.vatRate
        : args.vatRate * 100
      : undefined;

  const baseDoc: any = {
    DocumentType: isInvoiceReceipt ? 3 : 1,
    Subject:
      args.itemName || (isInvoiceReceipt ? "Invoice Receipt" : "Invoice"),
    Currency: args.currency || "ILS",
    TaxIncluded: true,
    ...(typeof vatPct === "number" ? { TaxPercentage: vatPct } : {}),
    Items: [
      {
        Name: args.itemName || "Item",
        Quantity: 1,
        Price: amount,
      },
    ],
    ...(args.buyerEmail
      ? { AssociatedEmails: [{ Mail: args.buyerEmail, IsUserMail: false }] }
      : {}),
    ...(args.externalTransactionId
      ? { ApiIdentifier: args.externalTransactionId }
      : {}),
  };

  if (args.clientId && args.clientId > 0) {
    baseDoc.ClientID = args.clientId;
  } else if (args.buyerName) {
    baseDoc.GeneralCustomer = { Name: args.buyerName };
  }

  if (isInvoiceReceipt) {
    baseDoc.Payments = [
      {
        Date: i4uDate(new Date()),
        Amount: amount,
        PaymentType: paymentType,
      },
    ];
  }

  const raw = await i4uPost<any>("CreateDocument", { doc: baseDoc, token });
  return normalizeCreateDocumentResult(raw);
}

/** עטיפה נוחה ל־ProcessApiRequestV2 (סליקה/לינק תשלום) */
export async function processApiRequestV2(body: ProcessApiV2Request) {
  return i4uPost<any>("ProcessApiRequestV2", body);
}
// Placeholder "hosted checkout" generator (no real clearing)
// Appends tx/amount/ccy to your ReturnUrl and sends user straight there.
export async function createHostedCheckout(args: {
  token: string;
  title: string;
  amount: number;
  currency: string;
  returnUrl: string;
}) {
  const tx = `i4u_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const url = new URL(args.returnUrl);
  url.searchParams.set("tx", tx);
  url.searchParams.set(
    "amount",
    (Math.round(args.amount * 100) / 100).toFixed(2)
  );
  url.searchParams.set("ccy", args.currency.toUpperCase());

  return {
    checkoutUrl: url.toString(),
    providerRefs: { tx },
  };
}

export async function sendDocumentByMail(args: {
  docId: string;
  to: string[]; // נמענים
  ccUserEmail?: string | null; // אם רוצים IsUserMail=true למשתמש
}) {
  const token = await getInvoice4uToken();

  if (!args.docId) throw new Error("sendDocumentByMail: docId is required");
  const emails = (args.to || []).filter(Boolean);
  if (!emails.length)
    return { ok: false, skipped: true, reason: "no recipients" };

  const doc = {
    ID: args.docId,
    AssociatedEmails: [
      ...emails.map((mail) => ({ Mail: mail, IsUserMail: false })),
      ...(args.ccUserEmail
        ? [{ Mail: args.ccUserEmail, IsUserMail: true }]
        : []),
    ],
  };

  const raw = await i4uPost<any>("SendDocumentByMail", { doc, token });
  return { ok: true, raw };
}
