// app/api/payments/save/route.ts

import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Package from "@/models/Package";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.error("🔒 לא נמצאה session או דוא״ל משתמש");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    const body = await req.json();
    const { itemName, amount, transactionId } = body;

    if (!itemName || amount === undefined || !transactionId) {
      console.error("❌ שדות חסרים בתשלום:", {
        itemName,
        amount,
        transactionId,
      });
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await connectToDatabase();

    const foundPackage = await Package.findOne({ name: itemName });
    if (!foundPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const smsToAdd = foundPackage.smsAmount ?? 0;

    // ✅ ממירים פעם אחת
    const parsedAmount = Number(amount);

    // ✅ חבילה חינמית – פעם אחת
    if (parsedAmount === 0) {
      const alreadyUsed = await Payment.findOne({
        email,
        itemName,
        moneyAmount: 0,
      });

      if (alreadyUsed) {
        console.warn("⚠️ המשתמש כבר קיבל את החבילה החינמית:", email);
        return NextResponse.json({
          success: false,
          error: "Free package already used",
        });
      }
    }

    // ✅ עדכון יתרת SMS + תוספת ל-paymentsTotal אם יש סכום > 0
    const inc: Record<string, number> = { smsBalance: smsToAdd };
    if (parsedAmount > 0) inc.paymentsTotal = parsedAmount;

    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $inc: inc },
      { new: true }
    );

    if (!updatedUser) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // ✅ שמירת התשלום
    const newPayment = new Payment({
      email,
      itemName,
      moneyAmount: parsedAmount,
      transactionId,
      smsAmount: smsToAdd,
    });

    await newPayment.save();

    return NextResponse.json({
      success: true,
      smsBalance: updatedUser.smsBalance,
      paymentsTotal: updatedUser.paymentsTotal, // אופציונלי: נחמד להחזיר
    });
  } catch (error) {
    console.error("🔥 שגיאה בשרת:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
