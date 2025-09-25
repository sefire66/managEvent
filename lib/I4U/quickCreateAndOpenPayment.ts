// lib/I4U/quickCreateAndOpenPayment.ts
import { createInvoice4UPaymentLink } from "./createPaymentLink";
import { normalizeCreatePaymentLinkPayload } from "./paymentLinkDefaults";
import { openPaymentPage } from "./openPaymentPage";

export type QuickPayParams = {
  // חובה לזיהוי
  ownerUserId: string;
  createdBy?: string; // ברירת מחדל = ownerUserId

  // payer (בד"כ מתוך session)
  payerName: string;
  payerEmail: string;
  payerPhone: string;

  // דינמי לפי כפתור/חבילה
  title: string; // כותרת החבילה
  amount: number; // ברוטו (כולל מע״מ)

  // אופציונלי
  billingProfileId?: string;
  billingProfileVatRate?: number | null; // אם זמין בצד־לקוח
  currency?: string; // דיפולט "ILS"
  createEndpoint?: string; // דיפולט: /api/invoice4u/payment-links
  callbackUrl?: string;
  returnUrl?: string;
  creditCardCompanyType?: string; // "6" | "7" | "12"
  apiKey?: string;
  sendEmailTo?: string; // אם לא — ייגזר מ-payerEmail
};

/**
 * צעד אחד: בונה payload עם דיפולטים → יוצר בקשה בשרת → פותח דף תשלום.
 */
export async function quickCreateAndOpenPayment(params: QuickPayParams) {
  const {
    ownerUserId,
    createdBy = ownerUserId,

    payerName,
    payerEmail,
    payerPhone,

    title,
    amount,

    billingProfileId,
    billingProfileVatRate,
    currency = "ILS",
    createEndpoint = "/api/invoice4u/payments/create-link",
    callbackUrl,
    returnUrl,
    creditCardCompanyType,
    apiKey,
    sendEmailTo,
  } = params;

  // מנרמלים + משלימים דיפולטים (כולל מע״מ מ־billingProfileVatRate אם סופק)
  const payload = normalizeCreatePaymentLinkPayload({
    ownerUserId,
    createdBy,

    payerName,
    payerEmail,
    payerPhone,

    title,
    amount,
    currency,

    billingProfileId,
    billingProfileVatRate,

    callbackUrl,
    returnUrl,
    creditCardCompanyType,
    apiKey,
    sendEmailTo: sendEmailTo ?? payerEmail,
  });

  // יצירה בשרת
  const res = await createInvoice4UPaymentLink(payload, {
    endpoint: createEndpoint,
  });

  // פתיחת דף התשלום
  openPaymentPage({
    redirectUrl: res.redirectUrl,
    shortUrl: res.shortUrl,
    token: res.token,
  });

  return res;
}
