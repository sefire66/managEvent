// app/api/payment-requests/[token]/send/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import { sendPaymentRequestEmail } from "@/lib/email";

/** בניית base URL מהכותרות (ב־dev/staging) */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export async function POST(req: Request, context: any) {
  try {
    await connectToDatabase();

    // חילוץ ה-token תוך עקיפת קונפליקט הטיפוסים
    const { token } = (context?.params ?? {}) as { token: string };

    const body = await req.json().catch(() => ({}));

    const to: string | undefined = body?.to;
    if (!to) {
      return NextResponse.json(
        { error: "missing 'to' (email)" },
        { status: 400 }
      );
    }

    const pr = await PaymentRequest.findOne({ token });
    if (!pr)
      return NextResponse.json({ error: "request not found" }, { status: 404 });

    if (pr.status !== "active") {
      return NextResponse.json(
        { error: "request is not active" },
        { status: 400 }
      );
    }
    if (pr.expiresAt && pr.expiresAt < new Date()) {
      return NextResponse.json({ error: "request expired" }, { status: 400 });
    }

    // בונים לינק תשלום
    const link =
      pr.shortUrl ||
      `${baseUrlFromHeaders(req)}/pay/${encodeURIComponent(pr.token)}`;

    // שליחת מייל דרך Resend
    await sendPaymentRequestEmail({
      to,
      link,
      title: pr.title,
      amount: pr.type === "payment" ? pr.amount : undefined,
      currency: pr.currency || "ILS",
      imageUrl: pr.imageUrl || undefined,
      description: pr.description || undefined,
      recipientName: body?.recipientName || null,
    });

    // לוג שליחה
    pr.sentCount = (pr.sentCount ?? 0) + 1;
    pr.sentChannel = "email";
    pr.lastSentAt = new Date();
    await pr.save();

    return NextResponse.json({ ok: true, link });
  } catch (err: any) {
    console.error("POST /api/payment-requests/[token]/send error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
