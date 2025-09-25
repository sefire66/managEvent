/**
 * lib/invoice4u.ts — REST only (ללא SOAP)
 * עובד לפי הדוגמאות של Postman:
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/VerifyLogin
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/CreateDocument
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/SendDocumentByMail
 */

const I4U_BASE = (
  process.env.I4U_BASE || "https://api.invoice4u.co.il/Services/ApiService.svc"
).replace(/\/+$/, "");

const I4U_EMAIL = process.env.I4U_EMAIL!;
const I4U_PASSWORD = process.env.I4U_PASSWORD!;

let _token: string | null = null;
let _tokenAt = 0;

/** תאריך בפורמט WCF: /Date(ms+TZ)/ */
function i4uDate(date: Date = new Date()) {
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
    // שים לב: ב־REST שלהם ה־token נשלח כחלק מה-BODY ולא בכותרת
    body: JSON.stringify(body ?? {}),
  });

  // לפעמים השרת מחזיר מחרוזת גולמית/JSON ישן
  const asText = await res.text();
  try {
    return JSON.parse(asText) as T;
  } catch {
    return asText as unknown as T; // גם GUID טקסטואלי יכול להגיע
  }
}

/** שליפת טוקן דרך REST VerifyLogin עם ניסיונות פרסינג מרובים */
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

  // פורמטים אפשריים:
  // 1) {"d":"<GUID>"}  (כמו בבדיקת Postman)
  // 2) {"VerifyLoginResult":"<GUID>"}
  // 3) "<GUID>"  (טקסט גולמי)
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

/** בדיקת טוקן (לא חובה, אבל שימושי לדיבוג) */
export async function isAuthenticated(token?: string) {
  const tk = token || (await getInvoice4uToken());
  const raw = await i4uPost<any>("IsAuthenticated", { token: tk });
  if (typeof raw === "boolean") return raw;
  return !!raw?.d;
}

/** עזר: חילוץ תוצאה בסיסית אחרי יצירת מסמך */
function normalizeCreateDocumentResult(raw: any) {
  // לעיתים מחזיר אובייקט מלא של Document, לעיתים עטוף בשדה CreateDocumentResult, ולעיתים { d: {...} }
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

/** מיפוי טיפוס תשלום בסיסי — 3=העברה/אחר, 4=אשראי/פייפאל */
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
 * יצירת קבלה (DocumentType=2)
 * אם יש clientId ניצור ללקוח קבוע; אחרת GeneralCustomer ע"פ שם (אם קיים).
 */
export async function createReceipt(args: {
  amount: number;
  currency?: string; // דיפולט ILS
  itemName?: string;
  buyerName?: string;
  buyerEmail?: string;
  notes?: string;
  externalTransactionId?: string; // ApiIdentifier לצורך מניעת כפילויות
  provider?: string | null;
  providerMethod?: string | null;
  paymentTypeOverride?: 3 | 4; // אם רוצים לכפות
  clientId?: number; // אופציונלי
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

  // יעד לקוח: ClientID או לקוח כללי
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
 * יצירת חשבונית/חשבונית־קבלה (DocumentType=1 או 3)
 * docType:
 *  - "InvoiceReceipt" → 3 (כולל Payments)
 *  - "Invoice" (דיפולט) → 1
 */
export async function createTaxInvoice(args: {
  amount: number;
  currency?: string;
  itemName?: string;
  buyerName?: string;
  buyerEmail?: string;
  vatRate?: number; // באחוזים (למשל 17) או כשבר (0.17) — נתמוך בשניהם
  externalTransactionId?: string; // ApiIdentifier
  provider?: string | null;
  providerMethod?: string | null;
  paymentTypeOverride?: 3 | 4;
  docType?: "Invoice" | "InvoiceReceipt";
  clientId?: number; // אופציונלי
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
      : undefined; // אם לא נשלח — ה־account דיפולט (למשל 17%)

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

/** שליחת המסמך במייל (כמו בדוגמת Postman) */
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

/**
 * createHostedCheckout — סנדהוק/דמו להוסטד-צ׳קאאוט:
 * בפועל, אם תרצה חיבור סליקה אמיתי של Invoice4U (ProcessApiRequestV2),
 * נצטרך גם API Key ועוד פרמטרים. כרגע זה מחזיר redirect מיידי ל-callback שלך.
 */
export async function createHostedCheckout(args: {
  token: string;
  title: string;
  amount: number;
  currency: string;
  returnUrl: string;
}) {
  // סימולציה של סליקה: מייצרים מזהה עסקה ושמים אותו על ה-callback
  const tx = `i4u_${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  const url = new URL(args.returnUrl);
  url.searchParams.set("tx", tx);
  // amount/ccy כבר הוספנו במסלול ה-checkout עצמו; זה רק גיבוי
  url.searchParams.set("amount", args.amount.toFixed(2));
  url.searchParams.set("ccy", args.currency.toUpperCase());

  return {
    checkoutUrl: url.toString(), // 👈 חשוב! זה השם שה-UI מצפה לו
    providerRefs: { tx },
  };
}
