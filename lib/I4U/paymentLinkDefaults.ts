// lib/I4U/paymentLinkDefaults.ts

// puts defaults in the Payment fields

import type { CreatePaymentLinkPayload } from "./createPaymentLink";

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
const asMoney = (n: number) => round2(Number(n || 0));

/** דיפולטים "בטוחים" לשדות שאפשר לאכלס מראש בצד־לקוח */
export const PAYMENT_LINK_DEFAULTS: Omit<
  CreatePaymentLinkPayload,
  | "ownerUserId"
  | "createdBy"
  | "payerName"
  | "payerEmail"
  | "payerPhone"
  | "title"
> & {
  amount: number;
  vatAmount: number;
} = {
  // עסקי
  description: undefined,
  amount: 0,
  vatRate: 18, // דיפולט אם אין פרופיל חיוב
  vatAmount: 0,
  currency: "ILS",
  orderId: undefined,

  // מסמך
  createDoc: true,
  docHeadline: "חשבונית מס קבלה",
  docItemName: "תשלום אונליין",
  docComments: undefined,
  clientMode: "autoCreate",

  // ספק/סליקה
  creditCardCompanyType: process.env.I4U_CREDITCOMPANY,
  apiKey: undefined,
  callbackUrl: undefined,
  returnUrl: undefined,

  // מייל
  sendEmailTo: undefined,

  // פרופיל חיוב
  billingProfileId: undefined,
};

/**
 * ממזג partial payload עם דיפולטים:
 * - trim למחרוזות
 * - עיגול כספים ל־2 ספרות
 * - חישוב vatAmount מתוך ברוטו אם לא הוזן
 * - תמיכה ב־billingProfileVatRate (גובר על vatRate ידני בצד־לקוח)
 */
export function normalizeCreatePaymentLinkPayload(
  partial: Partial<CreatePaymentLinkPayload> &
    Pick<
      CreatePaymentLinkPayload,
      | "ownerUserId"
      | "createdBy"
      | "payerName"
      | "payerEmail"
      | "payerPhone"
      | "title"
    > & {
      billingProfileVatRate?: number | null; // אופציה להזריק מע״מ מהפרופיל בצד־לקוח
    }
): CreatePaymentLinkPayload {
  const trim = (s?: string | null) =>
    (typeof s === "string" ? s.trim() : "") || "";

  const currency =
    trim(partial.currency || PAYMENT_LINK_DEFAULTS.currency) || "ILS";

  // אם הגיע מע״מ מהפרופיל — הוא גובר
  // עזר קצר
  const clamp = (x: number, min = 0, max = 100) =>
    Math.min(max, Math.max(min, x));
  const toNum = (v: unknown): number | null => {
    if (typeof v === "number" && Number.isFinite(v)) return v;
    if (typeof v === "string") {
      const n = Number(v.replace(",", ".").trim());
      return Number.isFinite(n) ? n : null;
    }
    return null;
  };

  // קדימויות: BillingProfile → UI → דיפולט (בלי עיגול, רק clamp)
  const vatRate = (() => {
    const fromProfile = toNum(partial.billingProfileVatRate);
    if (fromProfile != null) return clamp(fromProfile, 0, 100);

    const fromUi = toNum(partial.vatRate);
    if (fromUi != null) return clamp(fromUi, 0, 100);

    return clamp(PAYMENT_LINK_DEFAULTS.vatRate, 0, 100);
  })();

  const amount = asMoney(
    typeof partial.amount === "number" && isFinite(partial.amount)
      ? partial.amount
      : PAYMENT_LINK_DEFAULTS.amount
  );
  // =========================================

  // ========================================

  const vatAmount =
    typeof partial.vatAmount === "number" && isFinite(partial.vatAmount)
      ? asMoney(partial.vatAmount)
      : vatRate > 0
        ? asMoney((amount * vatRate) / (100 + vatRate))
        : 0;

  const createDoc =
    typeof partial.createDoc === "boolean"
      ? partial.createDoc
      : PAYMENT_LINK_DEFAULTS.createDoc;

  return {
    // מזהים (חובה)
    ownerUserId: partial.ownerUserId,
    createdBy: partial.createdBy,

    // payer
    payerName: trim(partial.payerName),
    payerEmail: trim(partial.payerEmail),
    payerPhone: trim(partial.payerPhone),

    // עסקי
    title: trim(partial.title),
    description: trim(partial.description || "") || undefined,
    amount,
    vatRate,
    vatAmount,
    currency,
    orderId: trim(partial.orderId || "") || undefined,

    // מסמך
    createDoc,
    docHeadline: createDoc
      ? trim(partial.docHeadline || PAYMENT_LINK_DEFAULTS.docHeadline)
      : undefined,
    docItemName: createDoc
      ? trim(partial.docItemName || PAYMENT_LINK_DEFAULTS.docItemName)
      : undefined,
    docComments: createDoc
      ? trim(partial.docComments || partial.description || "") || undefined
      : undefined,
    clientMode: createDoc
      ? (partial.clientMode || PAYMENT_LINK_DEFAULTS.clientMode)!
      : undefined,

    // ספק/סליקה
    creditCardCompanyType:
      trim(partial.creditCardCompanyType || "") || undefined,
    apiKey: trim(partial.apiKey || "") || undefined,
    callbackUrl: trim(partial.callbackUrl || "") || undefined,
    returnUrl: trim(partial.returnUrl || "") || undefined,

    // מייל
    sendEmailTo:
      trim(partial.sendEmailTo || partial.payerEmail || "") || undefined,

    // פרופיל חיוב (לשימוש/אימות בצד השרת)
    billingProfileId:
      partial.billingProfileId || PAYMENT_LINK_DEFAULTS.billingProfileId,
  };
}
