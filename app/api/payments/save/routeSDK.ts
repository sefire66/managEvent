import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import Package from "@/models/Package";
import User from "@/models/User";

export async function POST(req: Request) {
  try {
    // 🔍 התחברות ו-session
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      console.error("🔒 לא נמצאה session או דוא״ל משתמש");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;
    console.log("📧 משתמש מחובר:", email);

    // 🔍 קבלת נתוני התשלום מהקליינט
    const body = await req.json();
    console.log("📥 נתוני POST שהתקבלו:", body);

    const { itemName, amount, transactionId } = body;

    if (!itemName || !amount || !transactionId) {
      console.error("❌ שדות חסרים בתשלום:", {
        itemName,
        amount,
        transactionId,
      });
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    // 🔍 התחברות למסד נתונים
    await connectToDatabase();
    console.log("✅ התחברות למסד נתונים הצליחה");

    // 🔍 חיפוש החבילה
    const foundPackage = await Package.findOne({ name: itemName });
    if (!foundPackage) {
      console.error("❌ החבילה לא נמצאה:", itemName);
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    console.log("📦 חבילה נמצאה:", foundPackage);

    const smsToAdd = foundPackage.smsAmount;

    // 🔍 עדכון משתמש
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $inc: { smsBalance: smsToAdd } },
      { new: true }
    );

    if (!updatedUser) {
      console.error("❌ משתמש לא נמצא לעדכון:", email);
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    console.log("📲 כמות SMS עודכנה:", updatedUser.smsBalance);

    // 🔍 שמירת תשלום למסד
    const newPayment = new Payment({
      email,
      itemName,
      moneyAmount: parseFloat(amount),
      transactionId,
      smsAmount: smsToAdd, // ✅ שמירה במסד הנתונים
    });

    await newPayment.save();
    console.log("💾 תשלום נשמר במסד:", newPayment);

    return NextResponse.json({
      success: true,
      smsBalance: updatedUser.smsBalance,
    });
  } catch (error) {
    console.error("🔥 שגיאה בשרת:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
