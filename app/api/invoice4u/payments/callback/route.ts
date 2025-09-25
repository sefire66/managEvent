// app/api/invoice4u/payments/callback/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

// קורא את הגוף *וגם* מדפיס RAW לפי סוג התוכן
async function readBodyWithLogs(req: Request): Promise<{
  parsed: Record<string, any>;
  raw: string;
  contentType: string;
}> {
  const contentType = req.headers.get("content-type") || "";
  const url = new URL(req.url);

  // לוג בסיסי: method + url + query + headers
  const headersObj = Object.fromEntries(req.headers);
  console.log("[I4U callback] method:", req.method);
  console.log("[I4U callback] url:", url.pathname);
  console.log("[I4U callback] query:", Object.fromEntries(url.searchParams));
  console.log("[I4U callback] headers:", headersObj);

  // גוף הבקשה
  if (contentType.includes("application/json")) {
    const raw = await req.text();
    console.log("[I4U callback] raw (json):", raw);
    try {
      const parsed = JSON.parse(raw);
      return { parsed, raw, contentType };
    } catch {
      return { parsed: {}, raw, contentType };
    }
  }

  if (contentType.includes("application/x-www-form-urlencoded")) {
    const raw = await req.text();
    console.log("[I4U callback] raw (form):", raw);
    const parsed = Object.fromEntries(new URLSearchParams(raw));
    return { parsed, raw, contentType };
  }

  if (contentType.includes("multipart/form-data")) {
    const form = await req.formData();
    const entries: Record<string, any> = {};
    for (const [k, v] of form.entries()) {
      entries[k] = typeof v === "string" ? v : "[file]";
    }
    console.log("[I4U callback] multipart fields:", entries);
    return { parsed: entries, raw: "[multipart/form-data]", contentType };
  }

  // ניסיון כללי: קודם טקסט ואז parse ל-json/params
  const fallbackRaw = await req.text();
  console.log("[I4U callback] raw (unknown):", fallbackRaw);
  try {
    const parsed = JSON.parse(fallbackRaw);
    return { parsed, raw: fallbackRaw, contentType };
  } catch {
    const parsed = Object.fromEntries(new URLSearchParams(fallbackRaw));
    return { parsed, raw: fallbackRaw, contentType };
  }
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { parsed: body, raw: rawBody } = await readBodyWithLogs(req);

    // ==== קביעת הצלחה בסיסית (התאם אם יש פורמט רשמי) ====
    const errorCode = Number(body.ErrorCode ?? body.errorCode ?? 0);
    const statusStr = String(body.Status ?? body.status ?? "").toUpperCase();
    const isOk =
      (!errorCode || errorCode === 0) &&
      (statusStr === "OK" || statusStr === "SUCCESS" || statusStr === "");

    if (!isOk) {
      console.log("[I4U callback] marked as not OK → skipping save");
      return NextResponse.json({ ok: true, processed: false });
    }

    // ==== שדות חובה לפי המודל שלך ====
    const email: string | undefined = body.Email ?? body.email;
    const itemName: string | undefined = body.Description ?? body.description;
    const moneyAmountRaw = body.Sum ?? body.amount;
    const transactionId: string | undefined =
      body.PaymentId ||
      body.TransactionId ||
      body.DealId ||
      body.ClearingTraceId;

    if (!email || !String(email).trim()) {
      console.warn("[I4U callback] missing payer email");
      return NextResponse.json(
        { error: "missing payer email in callback" },
        { status: 400 }
      );
    }
    if (!itemName || !String(itemName).trim()) {
      console.warn("[I4U callback] missing itemName/Description");
      return NextResponse.json(
        { error: "missing itemName/Description in callback" },
        { status: 400 }
      );
    }
    const moneyAmount = Number(moneyAmountRaw);
    if (!Number.isFinite(moneyAmount) || moneyAmount <= 0) {
      console.warn("[I4U callback] invalid amount:", moneyAmountRaw);
      return NextResponse.json(
        { error: "invalid amount in callback" },
        { status: 400 }
      );
    }
    if (!transactionId) {
      console.warn("[I4U callback] missing transaction id");
      return NextResponse.json(
        { error: "missing transaction id in callback" },
        { status: 400 }
      );
    }

    // ==== אופציונלי ====
    const currency: string = String(body.Currency ?? "ILS");
    const provider = "invoice4u";

    // מזהי ספק שימושיים ללוג/פולואפ
    const providerRefs: Record<string, string> = {};
    [
      "PaymentId",
      "TransactionId",
      "DealId",
      "ClearingTraceId",
      "I4UClearingLogId",
      "OrderIdClientUsage",
      "AuthNumber",
      "CreditCardCompanyType",
      "DocumentId",
      "DocumentNumber",
      "PrintOriginalPDFLink",
    ].forEach((k) => {
      const v = body[k] ?? body[k[0].toLowerCase() + k.slice(1)];
      if (v != null && String(v).trim() !== "") providerRefs[k] = String(v);
    });

    // פרטי משלם (אם הגיעו)
    const payerName = body.FullName ?? null;
    const payerEmail = email;
    const payerPhone = body.Phone ?? null;

    // שמור RAW + parsed
    const rawWebhook = { raw: rawBody, parsed: body };

    // Idempotency: unique (provider, transactionId)
    try {
      const doc = await Payment.create({
        // חובה
        email: String(email),
        itemName: String(itemName),
        moneyAmount,
        transactionId: String(transactionId),

        // סליקה
        provider,
        providerMethod: null,
        providerRefs,
        status: "captured",
        currency,

        // שיוכים (לא זמינים ב-callback)
        requestId: null,
        eventId: null,
        ownerUserId: null,

        // משלם
        payerName,
        payerEmail,
        payerPhone,

        // RAW
        rawWebhook,
      });

      console.log("[I4U callback] saved Payment:", String(doc._id));
      return NextResponse.json({ ok: true, id: String(doc._id) });
    } catch (e: any) {
      if (e?.code === 11000) {
        console.log("[I4U callback] duplicate (retry) → already saved");
        return NextResponse.json({ ok: true, already: true });
      }
      throw e;
    }
  } catch (err: any) {
    console.error("POST /api/invoice4u/payments/callback error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
