// app/api/payments/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth"; // ⚠️ ודא שקובץ זה קיים
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";

export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);

    // ✅ בדיקה שיש משתמש עם role מתאים
    if (
      !session?.user ||
      !["admin", "super-admin"].includes(session.user.role ?? "")
    ) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    await connectToDatabase();

    // 📌 שליפת התשלומים מהחדש לישן
    const payments = await Payment.find().sort({ createdAt: -1 });

    return NextResponse.json(payments);
  } catch (error) {
    console.error("❌ Error fetching payments:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
