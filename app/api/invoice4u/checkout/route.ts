// app/api/invoice4u/checkout/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import { createHostedCheckout } from "@/lib/invoice4u";

/** בניית base URL מהכותרות (נוח ב-dev/staging/production מאחוד) */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// עיגול לשתי ספרות
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const token = searchParams.get("token");
    if (!token) {
      return NextResponse.json({ error: "token missing" }, { status: 400 });
    }

    // פרטים אופציונליים שמגיעים מהלקוח – נצרף ל-returnUrl
    const body = await req.json().catch(() => ({}) as any);
    const {
      buyerName,
      buyerEmail,
      buyerPhone,
      clientId,
      generalCustomerIdentifier,
      providerMethod,
      giftAmount: bodyGiftAmount,
    }: {
      buyerName?: string;
      buyerEmail?: string;
      buyerPhone?: string;
      clientId?: number;
      generalCustomerIdentifier?: string;
      providerMethod?: string;
      giftAmount?: number;
    } = body || {};

    const pr = await PaymentRequest.findOne({ token });
    if (!pr) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (pr.status !== "active") {
      return NextResponse.json({ error: "inactive request" }, { status: 400 });
    }
    if (pr.expiresAt && pr.expiresAt < new Date()) {
      return NextResponse.json({ error: "request expired" }, { status: 400 });
    }
    if (
      typeof pr.usageLimit === "number" &&
      typeof pr.uses === "number" &&
      pr.uses >= pr.usageLimit
    ) {
      return NextResponse.json(
        { error: "usage limit reached" },
        { status: 400 }
      );
    }

    // ---- חישוב סכום לתשלום ----
    let amountToPay = 0;
    let giftAmount: number | undefined;

    const feeMode = (pr.feeMode || "add_on") as "add_on" | "included";
    const feeFixed = typeof pr.feeFixed === "number" ? pr.feeFixed : 0;
    const feePercent =
      typeof pr.feePercent === "number"
        ? pr.feePercent > 1
          ? pr.feePercent / 100
          : pr.feePercent
        : 0;
    const vat =
      typeof pr.vatRate === "number"
        ? pr.vatRate > 1
          ? pr.vatRate / 100
          : pr.vatRate
        : 0;

    if (pr.type === "payment") {
      if (typeof pr.amount !== "number" || pr.amount <= 0) {
        return NextResponse.json(
          { error: "invalid payment amount" },
          { status: 400 }
        );
      }
      amountToPay = round2(pr.amount);
    } else {
      // gift
      if (typeof pr.amount === "number") {
        // מתנה עם סכום קבוע
        giftAmount = round2(pr.amount);
      } else {
        // מתנה עם סכום פתוח – מהגוף
        const g = Number(bodyGiftAmount);
        if (!Number.isFinite(g) || g < 1) {
          return NextResponse.json(
            { error: "invalid giftAmount" },
            { status: 400 }
          );
        }
        if (typeof pr.minAmount === "number" && g < pr.minAmount) {
          return NextResponse.json(
            { error: `giftAmount must be >= ${pr.minAmount}` },
            { status: 400 }
          );
        }
        giftAmount = round2(g);
      }

      const feeBase = round2(feeFixed + (giftAmount ?? 0) * feePercent);
      const feeVat = round2(feeBase * vat);
      const feeTotal = round2(feeBase + feeVat);

      amountToPay =
        feeMode === "included"
          ? round2(giftAmount!)
          : round2((giftAmount ?? 0) + feeTotal);
    }

    // יעד חזרה לאחר "תשלום" (callback שלנו)
    const base = baseUrlFromHeaders(req);
    const returnUrl = new URL(`${base}/api/invoice4u/callback`);
    returnUrl.searchParams.set("token", token);
    // נחזיר גם מידע רלוונטי ללוגיקה בהמשך
    returnUrl.searchParams.set("amount", amountToPay.toFixed(2));
    returnUrl.searchParams.set("ccy", (pr.currency || "ILS").toUpperCase());
    if (typeof giftAmount === "number") {
      returnUrl.searchParams.set("gift", String(giftAmount));
    }
    if (buyerName) returnUrl.searchParams.set("buyerName", buyerName);
    if (buyerEmail) returnUrl.searchParams.set("buyerEmail", buyerEmail);
    if (buyerPhone) returnUrl.searchParams.set("buyerPhone", buyerPhone);
    if (providerMethod)
      returnUrl.searchParams.set("providerMethod", providerMethod);
    if (typeof clientId === "number" && clientId > 0)
      returnUrl.searchParams.set("clientId", String(clientId));
    if (generalCustomerIdentifier)
      returnUrl.searchParams.set(
        "generalCustomerIdentifier",
        generalCustomerIdentifier
      );

    // יצירת "קישור תשלום" — כאן placeholder שמנתב ישירות ל-callback (ללא סליקה אמיתית)
    const { checkoutUrl, providerRefs } = await createHostedCheckout({
      token,
      title: pr.title,
      amount: amountToPay,
      currency: pr.currency || "ILS",
      returnUrl: returnUrl.toString(),
    });

    if (!checkoutUrl) {
      return NextResponse.json(
        { error: "missing checkoutUrl in response" },
        { status: 500 }
      );
    }

    return NextResponse.json({ checkoutUrl, providerRefs });
  } catch (err: any) {
    console.error("POST /api/invoice4u/checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
