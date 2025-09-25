import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import { sendPaymentRequestEmail } from "@/lib/email";
import { callInvoice4U, money2, ProcessApiV2Request } from "@/lib/invoice4u";

export const dynamic = "force-dynamic";

/** בניית base URL מהכותרות (dev/staging) */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// טוקן קצר (לא תלוי ספריה)
function shortToken() {
  return (
    Math.random().toString(36).slice(2, 10) + Date.now().toString(36).slice(-4)
  );
}

type CreatePayload = {
  // payer
  payerName: string;
  payerEmail: string;
  payerPhone: string;

  // business
  title: string; // Description
  description?: string;
  amount: number; // gross
  vatRate: number; // %
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
  apiKey?: string; // אם לא שולחים כאן, השרת ישלים מה-ENV
  callbackUrl?: string;
  returnUrl?: string;

  // שיוך
  ownerUserId: string; // חובה
  createdBy?: string;

  // שליחה
  sendEmailTo?: string;
};

export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const body = (await req.json()) as CreatePayload;

    // === ולידציה בסיסית ===
    const errors: string[] = [];
    if (!body.ownerUserId) errors.push("ownerUserId required");
    if (!body.payerName?.trim()) errors.push("payerName required");
    if (!/.+@.+\..+/.test(body.payerEmail || ""))
      errors.push("payerEmail invalid");
    if (!body.payerPhone?.trim()) errors.push("payerPhone required");
    if (!(Number(body.amount) > 0)) errors.push("amount must be > 0");
    if (!body.title?.trim()) errors.push("title required");
    if (errors.length) {
      return NextResponse.json({ error: errors.join(", ") }, { status: 400 });
    }

    // === בניית בקשה לספק ===
    const currency = (body.currency || "ILS").trim();
    const vatRate = Math.max(0, Math.round(Number(body.vatRate) || 0));

    console.log("=======vatRate======================");
    console.log("vatRate : ", vatRate);
    console.log("=======end======================");

    const gross = Number(body.amount);
    const net = Math.max(0, gross - (Number(body.vatAmount) || 0));

    const createDoc = body.createDoc ?? true; // דיפולט: true
    const clientMode = body.clientMode || "autoCreate";

    // parse credit company type כמספר תקין (אם לא נשלח — נשאיר undefined)
    const ccRaw = (body.creditCardCompanyType || "").trim();
    const ccType = ccRaw ? Number(ccRaw) : undefined;
    const ccValid =
      typeof ccType === "number" && Number.isFinite(ccType)
        ? ccType
        : undefined;

    const requestPayload: ProcessApiV2Request = {
      request: {
        Invoice4UUserApiKey: body.apiKey || process.env.I4U_API_KEY || "",

        // מספרים/בוליאנים אמיתיים — לפי הדוקומנטציה
        Type: 1,
        CreditCardCompanyType: ccValid, // 6/7/12 לפי הטרמינל שלך
        IsAutoCreateCustomer: clientMode === "autoCreate",

        FullName: body.payerName.trim(),
        Phone: body.payerPhone.trim(),
        Email: body.payerEmail.trim(),

        Sum: gross, // double
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
        DocItemPrice: createDoc ? money2(net) : undefined, // נטו לשורה כמחרוזה
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
          `${baseUrlFromHeaders(req)}/api/invoice4u/callback`,
        ReturnUrl:
          body.returnUrl ||
          process.env.I4U_RETURN_URL ||
          `${baseUrlFromHeaders(req)}/pay/success`,

        // דגלים לא בשימוש כרגע
        AddToken: false,
        AddTokenAndCharge: false,
        ChargeWithToken: false,
        Refund: false,
        IsStandingOrderClearance: false,
        StandingOrderDuration: 0,

        // לא Bit
        IsBitPayment: false,
      },
    };

    // לפני הקריאה — להדפיס payload בלי המפתח
    const safePayload = {
      ...requestPayload,
      request: { ...requestPayload.request, Invoice4UUserApiKey: "***" },
    };
    console.log("[I4U] request payload:", JSON.stringify(safePayload, null, 2));

    const providerRes = await callInvoice4U(
      "ProcessApiRequestV2",
      requestPayload
    );

    // אחרי הקריאה — להדפיס את התגובה כפי שהיא
    console.log("[I4U] response:", JSON.stringify(providerRes, null, 2));

    // // === קריאה לספק (הפקת לינק מאובטח) ===
    // const providerRes = await callInvoice4U<any>(
    //   "ProcessApiRequestV2",
    //   requestPayload
    // );

    // לפי הדוקו: הלינק לדף/אייפריים נמצא ב־ClearingRedirectUrl
    const d = providerRes?.d ?? providerRes;
    const hostedPageUrl = d?.ClearingRedirectUrl as string | undefined;
    if (!hostedPageUrl) {
      return NextResponse.json(
        {
          error: "failed to get hosted link",
          providerRes,
        },
        { status: 502 }
      );
    }

    // מזהי ספק אופציונאליים
    const providerTransactionId: string | null =
      providerRes?.PaymentId ||
      providerRes?.TransactionId ||
      providerRes?.DealId ||
      null;

    // === שמירה בבסיס הנתונים שלנו ===
    const token = shortToken();
    const now = new Date();

    const prDoc = await PaymentRequest.create({
      token,
      title: body.title,
      description: body.description || null,
      type: "payment",
      status: "active",

      amount: gross,
      vatRate,
      vatAmount: gross - net,
      currency,

      // שומרים את ה־URL שקיבלנו מהספק ב-shortUrl
      shortUrl: hostedPageUrl,

      // שיוכים ויצירה
      ownerUserId: body.ownerUserId,
      createdBy: body.createdBy || body.ownerUserId,
      createdAt: now,

      // אופציונלי: usageLimit/expiry נשארים דיפולט
    });

    // === שליחת מייל (אם ביקשת או אם יש יעד) ===
    const emailTo = body.sendEmailTo || body.payerEmail;
    if (emailTo) {
      await sendPaymentRequestEmail({
        to: emailTo,
        link: hostedPageUrl, // שולחים את דף התשלום המאובטח של הספק
        title: body.title,
        amount: gross,
        currency,
        description: body.description || undefined,
        recipientName: body.payerName,
      });

      // עדכון לוג שליחה
      prDoc.sentCount = (prDoc.sentCount ?? 0) + 1;
      prDoc.sentChannel = "email";
      prDoc.lastSentAt = new Date();
      await prDoc.save();
    }

    return NextResponse.json({
      ok: true,
      token: prDoc.token,
      shortUrl: prDoc.shortUrl,
      provider: {
        // נחזיר רק מה שכנראה שימושי לדיבוג; אפשר להחזיר raw אם תרצה
        ClearingRedirectUrl: providerRes?.ClearingRedirectUrl,
        PaymentId: providerRes?.PaymentId,
        Error: providerRes?.Error,
        ErrorCode: providerRes?.ErrorCode,
      },
    });
  } catch (err: any) {
    console.error("POST /api/invoice4u/payment-links error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
