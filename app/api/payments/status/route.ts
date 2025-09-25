import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export const dynamic = "force-dynamic";

// GET /api/payments/status?transactionId=... | paymentId=... | orderId=...
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const url = new URL(req.url);
    const transactionId = url.searchParams.get("transactionId");
    const paymentId = url.searchParams.get("paymentId");
    const orderId = url.searchParams.get("orderId");

    if (!transactionId && !paymentId && !orderId) {
      return NextResponse.json({ ok: true, found: false, status: "pending" });
    }

    // בניית פילטרים גמישים
    const or: any[] = [];
    if (transactionId) {
      or.push({ transactionId: transactionId });
    }
    if (paymentId) {
      or.push({ transactionId: paymentId });
      or.push({ "providerRefs.PaymentId": paymentId });
      or.push({ "providerRefs.TransactionId": paymentId });
      or.push({ "providerRefs.DealId": paymentId });
      or.push({ "providerRefs.ClearingTraceId": paymentId });
      or.push({ "providerRefs.I4UClearingLogId": paymentId });
    }
    if (orderId) {
      or.push({ "providerRefs.OrderIdClientUsage": orderId });
    }

    const doc = await Payment.findOne(or.length ? { $or: or } : {}).lean();
    if (!doc) {
      return NextResponse.json({ ok: true, found: false, status: "pending" });
    }

    return NextResponse.json({
      ok: true,
      found: true,
      status: doc.status,
      itemName: doc.itemName,
      moneyAmount: doc.moneyAmount,
      currency: doc.currency || "ILS",
      transactionId: doc.transactionId,
      providerRefs: doc.providerRefs
        ? Object.fromEntries(doc.providerRefs as any)
        : undefined,
      docId: doc.docId ?? null,
      docNumber: (doc as any).docNumber ?? null, // אם אין שדה כזה אצלך השאר null
      docUrl: doc.docUrl ?? null,
      createdAt: doc.createdAt?.toISOString?.() || undefined,
    });
  } catch (err: any) {
    console.error("GET /api/payments/status error:", err);
    return NextResponse.json(
      { ok: false, error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
