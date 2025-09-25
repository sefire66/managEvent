// app/api/sms/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import User from "@/models/User";
import { connectToDatabase } from "@/lib/mongodb";

const BASE = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function POST(req: Request) {
  const session = await getServerSession(authOptions);
  if (!session || !session.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();
  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  if (user.smsBalance <= 0) {
    return NextResponse.json({ error: "No SMS balance left" }, { status: 400 });
  }

  const { to, message } = await req.json();
  if (!to || !message) {
    return NextResponse.json(
      { error: "Missing phone or message" },
      { status: 400 }
    );
  }

  // ✅ שולחים באמת דרך /api/inforUsms
  try {
    const providerRes = await fetch(`${BASE}/api/inforUsms`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // אין צורך ב־credentials כאן – זה רץ בצד השרת
      body: JSON.stringify({ to, message }),
    });

    const data = await providerRes.json().catch(() => null);
    if (!providerRes.ok || !data?.success) {
      // לא מפחיתים יתרה כשנכשל
      return NextResponse.json(
        { error: data?.error || "Failed to send SMS" },
        { status: 502 }
      );
    }

    // ✅ הצליח – מפחיתים יתרה ומעלים used
    user.smsBalance = Math.max(0, (user.smsBalance ?? 0) - 1);
    user.smsUsed = (user.smsUsed ?? 0) + 1;
    await user.save();

    return NextResponse.json({
      success: true,
      id: data?.id || "ok",
      smsBalance: user.smsBalance,
      smsUsed: user.smsUsed,
    });
  } catch (e: any) {
    return NextResponse.json(
      { error: e?.message || "Provider error" },
      { status: 500 }
    );
  }
}
