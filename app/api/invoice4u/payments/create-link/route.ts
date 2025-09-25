import { NextResponse } from "next/server";
import { callInvoice4U, money2, ProcessApiV2Request } from "@/lib/invoice4u";

export const dynamic = "force-dynamic";

/** בניית base URL מהכותרות (dev/staging/prod) */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

type CreatePaymentLinkBody = {
  // payer
  payerName: string;
  payerEmail: string;
  payerPhone: string;

  // business
  title: string; // Description
  description?: string;
  amount: number; // gross
  vatRate: number; // 0–100, ללא עיגול
  vatAmount: number; // ₪
  currency?: string; // ILS
  orderId?: string;

  // document
  createDoc?: boolean; // default true
  docHeadline?: string;
  docItemName?: string;
  docComments?: string;
  clientMode?: "general" | "autoCreate";

  // provider settings
  creditCardCompanyType?: string; // "6"/"7"/"12"
  apiKey?: string; // אם לא נשלח — יילקח מ-ENV
  callbackUrl?: string; // דיפולט: /api/invoice4u/payments/callback
  returnUrl?: string; // דיפולט: /pay/success

  // שיוך פנימי
  ownerUserId: string; // חובה אצלך ב-client לשיוך, לא נשמר כאן
  createdBy?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as CreatePaymentLinkBody;

    // === ולידציה בסיסית (ליצירת לינק בלבד) ===
    const errors: string[] = [];
    if (!body.payerName?.trim()) errors.push("payerName required");
    if (!/.+@.+\..+/.test(body.payerEmail || ""))
      errors.push("payerEmail invalid");
    if (!body.payerPhone?.trim()) errors.push("payerPhone required");
    if (!(Number(body.amount) > 0)) errors.push("amount must be > 0");
    if (!body.title?.trim()) errors.push("title required");
    if (errors.length) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    const baseUrl = baseUrlFromHeaders(req);
    const currency = (body.currency || "ILS").trim();

    // אין עיגול, רק תחימה לטווח
    const clamp = (x: number, min = 0, max = 100) =>
      Math.min(max, Math.max(min, x));
    const vatRate = clamp(Number(body.vatRate) || 0, 0, 100);

    const gross = Number(body.amount);
    const net = Math.max(0, gross - (Number(body.vatAmount) || 0));

    const createDoc = body.createDoc ?? true;
    const clientMode = body.clientMode || "autoCreate";

    const ccRaw = (body.creditCardCompanyType || "").trim();
    const ccType = ccRaw ? Number(ccRaw) : undefined;
    const ccValid = Number.isFinite(ccType) ? ccType : undefined;

    const requestPayload: ProcessApiV2Request = {
      request: {
        Invoice4UUserApiKey: body.apiKey || process.env.I4U_API_KEY || "",

        Type: 1,
        CreditCardCompanyType: ccValid, // 6/7/12
        IsAutoCreateCustomer: clientMode === "autoCreate",

        FullName: body.payerName.trim(),
        Phone: body.payerPhone.trim(),
        Email: body.payerEmail.trim(),

        Sum: gross,
        Description: body.title.trim(),
        PaymentsNum: 1,
        Currency: currency,
        OrderIdClientUsage: body.orderId || "",

        // מסמך
        IsDocCreate: !!createDoc,
        DocHeadline: createDoc
          ? body.docHeadline || "חשבונית מס קבלה"
          : undefined,
        DocComments: createDoc
          ? body.docComments || body.description || undefined
          : undefined,
        IsManualDocCreationsWithParams: false,
        DocItemQuantity: createDoc ? "1" : undefined,
        DocItemPrice: createDoc ? money2(net) : undefined, // נטו לשורה כמחרוזת
        DocItemTaxRate: createDoc ? String(vatRate) : undefined,
        IsItemsBase64Encoded: false,
        DocItemName: createDoc
          ? body.docItemName || "תשלום אונליין"
          : undefined,

        IsGeneralClient: clientMode === "general",

        // URLs
        CallBackUrl:
          body.callbackUrl ||
          process.env.I4U_CALLBACK_URL ||
          `${baseUrl}/api/invoice4u/payments/callback`,
        ReturnUrl:
          body.returnUrl ||
          process.env.I4U_RETURN_URL ||
          `${baseUrl}/pay/success`,

        // דגלים לא בשימוש
        AddToken: false,
        AddTokenAndCharge: false,
        ChargeWithToken: false,
        Refund: false,
        IsStandingOrderClearance: false,
        StandingOrderDuration: 0,
        IsBitPayment: false,
      },
    };

    // לוג ללא מפתח
    const safePayload = {
      ...requestPayload,
      request: { ...requestPayload.request, Invoice4UUserApiKey: "***" },
    };
    console.log("[I4U create-link] req:", JSON.stringify(safePayload, null, 2));

    // יצירת לינק אצל הספק
    const providerRes = await callInvoice4U(
      "ProcessApiRequestV2",
      requestPayload
    );
    console.log("[I4U create-link] res:", JSON.stringify(providerRes, null, 2));

    const d = providerRes?.d ?? providerRes;
    const hostedPageUrl = d?.ClearingRedirectUrl as string | undefined;

    if (!hostedPageUrl) {
      return NextResponse.json(
        { error: "failed to get hosted link", providerRes },
        { status: 502 }
      );
    }

    const providerPaymentId: string | null =
      providerRes?.PaymentId ??
      providerRes?.TransactionId ??
      providerRes?.DealId ??
      null;

    return NextResponse.json({
      ok: true,
      redirectUrl: hostedPageUrl,
      providerPaymentId,
    });
  } catch (err: any) {
    console.error("POST /api/invoice4u/payments/create-link error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
