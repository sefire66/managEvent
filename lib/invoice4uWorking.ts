/**
 * lib/invoice4u.ts — REST only (ללא SOAP)
 * עובד לפי הדוגמאות של Postman:
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/VerifyLogin
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/CreateDocument
 *   POST https://api.invoice4u.co.il/Services/ApiService.svc/SendDocumentByMail
 */

const I4U_BASE =
  process.env.I4U_BASE || "https://api.invoice4u.co.il/Services/ApiService.svc";

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

  let text: string | null = null;
  try {
    // לפעמים השרת מחזיר מחרוזת גולמית/JSON ישן
    const asText = await res.text();
    text = asText;
    try {
      return JSON.parse(asText) as T;
    } catch {
      // אם זה לא JSON — נחזיר את הטקסט כפי שהוא (יכול להיות GUID)
      return asText as unknown as T;
    }
  } catch (e) {
    throw new Error(
      `Invoice4U POST failed (${res.status} ${res.statusText}) to ${url}`
    );
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
    // עוזר דיבוג: נראה למפתח מה התקבל מהשרת
    // (בפרוד לא להדפיס סיסמה/מייל; פה אין הדפסה שלהם)
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
  // לרוב יחזיר { "d": true/false } או true/false
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

/** מיפוי טיפוס תשלום בסיסי — 3=העברה, 4=אשראי/אחר */
function normalizePaymentType(pt?: number) {
  return pt === 4 ? 4 : 3;
}

/**
 * יצירת חשבונית־קבלה (DocumentType=3) ללקוח קיים (ClientID) לפי הדוגמה הרשמית בפוסטמן.
 * Items[] + Payments[] + token בטופ-לבל.
 */
export async function createInvoiceReceiptREST(args: {
  clientId: number; // חובה
  amount: number; // חובה
  subject?: string;
  currency?: string; // ברירת מחדל ILS
  paymentType?: 3 | 4; // ברירת מחדל 3 (העברה)
  buyerEmail?: string; // לא חובה; יישלח רק אם קיים
  vatPercentage?: number; // למשל 0 לעוסק פטור, או 17
  apiIdentifier?: string; // מומלץ למניעת כפילות
  taxIncluded?: boolean; // ברירת מחדל true
}) {
  const token = await getInvoice4uToken();

  if (!args?.clientId || args.clientId <= 0) {
    throw new Error("createInvoiceReceiptREST: clientId is required");
  }
  if (!args?.amount || args.amount <= 0) {
    throw new Error("createInvoiceReceiptREST: amount must be > 0");
  }

  const amount = Number(args.amount.toFixed(2));
  const paymentType = normalizePaymentType(args.paymentType);
  const taxIncluded =
    typeof args.taxIncluded === "boolean" ? args.taxIncluded : true;

  // לפי Postman: Items כ־Array (לא עטיפות של SOAP), Payments כ־Array
  const doc: any = {
    DocumentType: 3, // Invoice Receipt
    ClientID: args.clientId,
    Subject: args.subject || "Subject for new invoice receipt",
    Currency: args.currency || "ILS",
    TaxIncluded: taxIncluded,
    ...(typeof args.vatPercentage === "number"
      ? { TaxPercentage: args.vatPercentage }
      : {}),
    ApiIdentifier: args.apiIdentifier || undefined,
    Items: [
      {
        Name: "Item",
        Quantity: 1,
        Price: amount,
      },
    ],
    Payments: [
      {
        Date: i4uDate(new Date()),
        Amount: amount,
        PaymentType: paymentType,
      },
    ],
    AssociatedEmails: args.buyerEmail
      ? [{ Mail: args.buyerEmail, IsUserMail: false }]
      : undefined,
  };

  const raw = await i4uPost<any>("CreateDocument", { doc, token });
  return normalizeCreateDocumentResult(raw);
}

/** שליחת המסמך במייל (כמו בדוגמת Postman) */
export async function sendDocumentByMailREST(args: {
  docId: string;
  to: string[]; // נמענים
  ccUserEmail?: string | null; // אם רוצים IsUserMail=true למשתמש
}) {
  const token = await getInvoice4uToken();

  if (!args.docId) throw new Error("sendDocumentByMailREST: docId is required");
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
