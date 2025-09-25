import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";

/** עיגול ל־2 ספרות */
function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** בניית base URL מהכותרות */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

/**
 * נקודת חזרה אחרי תשלום בהוסטד צ'קאאוט של Invoice4U.
 * כאן אנחנו מסמנים את הבקשה כשולמה ע"י קריאה ל־mark-paid.
 * מצפה ל־query params: token, tx, amount, ccy?, gift?
 * וכן buyerName, buyerEmail, buyerPhone, providerMethod, clientId, generalCustomerIdentifier (אופציונלי)
 */
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const token = url.searchParams.get("token");
    const tx = url.searchParams.get("tx"); // מזהה טרנזקציה אצל ספק התשלום
    const amountStr = url.searchParams.get("amount"); // סכום ששולם בפועל לפי ספק
    const ccyFromQuery = url.searchParams.get("ccy") || undefined;
    const giftStr = url.searchParams.get("gift"); // giftAmount (לא חובה)

    // פרטי לקוח וזהויות (אופציונלי)
    const buyerName = url.searchParams.get("buyerName") || undefined;
    const buyerEmail = url.searchParams.get("buyerEmail") || undefined;
    const buyerPhone = url.searchParams.get("buyerPhone") || undefined;
    const providerMethod =
      url.searchParams.get("providerMethod") || "credit_card";
    const clientIdStr = url.searchParams.get("clientId");
    const generalCustomerIdentifier =
      url.searchParams.get("generalCustomerIdentifier") || undefined;

    const clientId =
      clientIdStr && !Number.isNaN(Number(clientIdStr))
        ? Number(clientIdStr)
        : undefined;

    if (!token || !tx || !amountStr) {
      return NextResponse.json({ error: "missing params" }, { status: 400 });
    }

    // סכום ששולם בפועל (עיגול לפני השוואה)
    const paidAmount = round2(Number(amountStr));
    if (!Number.isFinite(paidAmount) || paidAmount <= 0) {
      return NextResponse.json({ error: "bad amount" }, { status: 400 });
    }

    const pr = await PaymentRequest.findOne({ token });
    if (!pr) {
      return NextResponse.json({ error: "request not found" }, { status: 404 });
    }

    // מטבע להצמדה ל-mark-paid: עדיפות ל-ccy מהפרוביידר, אחרת ל-PR, אחרת ILS
    const currency = (ccyFromQuery || pr.currency || "ILS").toUpperCase();

    // ---- חישוב סכום צפוי בצד שרת (הגנה) ----
    const pct = pr.feePercent ?? 0; // נשאיר כמו שהוא כרגע (לְתיקון מאוחר)
    const fixed = pr.feeFixed ?? 0;
    const vat = pr.vatRate ?? 0;

    let expectedToPay = 0;
    let giftAmount: number | undefined;

    if (pr.type === "payment") {
      if (typeof pr.amount !== "number" || pr.amount <= 0) {
        return NextResponse.json(
          { error: "invalid PR amount" },
          { status: 400 }
        );
      }
      expectedToPay = round2(pr.amount);
    } else {
      // gift
      if (typeof pr.amount === "number") {
        giftAmount = pr.amount;
      } else {
        const g = Number(giftStr);
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
        giftAmount = g;
      }

      const feeBase = fixed + (giftAmount ?? 0) * pct;
      const feeVat = feeBase * vat;
      const feeTotal = feeBase + feeVat;

      expectedToPay =
        pr.feeMode === "included" ? giftAmount! : giftAmount! + feeTotal;

      expectedToPay = round2(expectedToPay);
    }

    // מרווח טולרנס קטן (עגולים)
    const DIFF_TOL = 0.5; // חצי שקל
    if (Math.abs(paidAmount - expectedToPay) > DIFF_TOL) {
      return NextResponse.json(
        {
          error: `amount mismatch: paid=${paidAmount} expected=${expectedToPay}`,
        },
        { status: 400 }
      );
    }

    // ---- קריאה ל-mark-paid (Idempotency-Key = tx) ----
    const base = baseUrlFromHeaders(req);
    const res = await fetch(
      `${base}/api/payment-requests/${encodeURIComponent(token)}/mark-paid`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": tx,
        },
        body: JSON.stringify({
          provider: "invoice4u",
          providerMethod,
          providerRefs: { checkout: "hosted" },
          transactionId: tx,
          currency,
          paidAmount: expectedToPay, // משתמשים בערך שחושב בצד שרת
          giftAmount:
            typeof giftAmount === "number" ? round2(giftAmount) : undefined,

          // פרטי הלקוח + מזהי לקוח (אופציונלי)
          payerName: buyerName,
          payerEmail: buyerEmail,
          payerPhone: buyerPhone,
          clientId,
          generalCustomerIdentifier,
        }),
      }
    );

    const json = await res.json().catch(() => ({}));
    if (!res.ok) {
      console.error("mark-paid failed from callback:", json);
      return NextResponse.json(
        { error: json?.error || "mark-paid failed" },
        { status: 500 }
      );
    }

    // ✅ חזרה לעמוד התשלום עם סימון mark-paid=1
    return NextResponse.redirect(
      `${base}/pay/${encodeURIComponent(token)}?mark-paid=1`
    );
  } catch (err: any) {
    console.error("GET /api/invoice4u/callback error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
