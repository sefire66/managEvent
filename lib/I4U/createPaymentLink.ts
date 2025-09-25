// lib/I4U/createPaymentLink.ts

/** גוף הבקשה ליצירת לינק תשלום (Hosted Link) בצד השרת שלנו */
export type CreatePaymentLinkPayload = {
  // מזהי בעלים/יוצר (חובה)
  ownerUserId: string;
  createdBy: string;

  // payer (חובה)
  payerName: string;
  payerEmail: string;
  payerPhone: string;

  // עסקי
  title: string; // Description
  description?: string; // DocComments
  amount: number; // ברוטו (כולל מע״מ), 2 ספרות
  vatRate: number; // 0–100, כולל שברים (למשל 17.5) — ללא עיגול
  vatAmount: number; // 2 ספרות
  currency: string; // "ILS" וכו'
  orderId?: string;

  // מסמך (אופציונלי)
  createDoc?: boolean;
  docHeadline?: string;
  docItemName?: string;
  docComments?: string;
  clientMode?: "general" | "autoCreate";

  // ספק/סליקה (אופציונלי)
  creditCardCompanyType?: string; // "6" | "7" | "12"
  apiKey?: string;
  callbackUrl?: string;
  returnUrl?: string;

  // מייל לנמען (אופציונלי)
  sendEmailTo?: string;

  // פרופיל חיוב למדיניות מע״מ (אופציונלי אך מומלץ)
  billingProfileId?: string;
};

/** תשובת ה־API שלנו ליצירת לינק תשלום */
export type CreatePaymentLinkResult = {
  ok: boolean;
  redirectUrl: string; // ClearingRedirectUrl / paymentUrl (מחויב)
  providerPaymentId?: string | null; // מזהה ספק אם קיים (PaymentId/TransactionId)
  // תאימות לאחור — ייתכן ויהיו ריקים ב-API החדש:
  token?: string | null;
  shortUrl?: string | null;
  error?: string;
};

/**
 * יוצר לינק תשלום אצלנו ומחזיר קישורים לפתיחת דף התשלום.
 * ברירת מחדל: ה-API החדש שמחזיר redirectUrl בלבד.
 */
export async function createInvoice4UPaymentLink(
  payload: CreatePaymentLinkPayload,
  {
    endpoint = "/api/invoice4u/payments/create-link",
    signal,
  }: { endpoint?: string; signal?: AbortSignal } = {}
): Promise<CreatePaymentLinkResult> {
  const res = await fetch(endpoint, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
    signal,
  });

  let raw: any = null;
  try {
    raw = await res.json();
  } catch {}

  if (!res.ok) {
    const msg = raw?.error || raw?.message || "failed to create hosted link";
    throw new Error(msg);
  }

  // מיפוי בטוח לשמות אפשריים
  const redirectUrl: string | null =
    raw?.redirectUrl ??
    raw?.ClearingRedirectUrl ??
    raw?.paymentUrl ??
    raw?.url ??
    null;

  if (!redirectUrl) {
    throw new Error("missing redirectUrl from create-link response");
  }

  const providerPaymentId: string | null =
    raw?.providerPaymentId ??
    raw?.PaymentId ??
    raw?.TransactionId ??
    raw?.DealId ??
    null;

  return {
    ok: true,
    redirectUrl,
    providerPaymentId,
    token: raw?.token ?? null,
    shortUrl: raw?.shortUrl ?? null,
  };
}
