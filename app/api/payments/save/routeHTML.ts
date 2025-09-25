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
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { itemName, amount, transactionId } = await req.json();
    const email = session.user.email;

    if (!itemName || !amount || !transactionId) {
      return NextResponse.json({ error: "Missing fields" }, { status: 400 });
    }

    await connectToDatabase();

    // מציאת החבילה
    const foundPackage = await Package.findOne({ name: itemName });
    if (!foundPackage) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    const smsToAdd = foundPackage.smsAmount;

    // עדכון כמות SMS
    const updatedUser = await User.findOneAndUpdate(
      { email },
      { $inc: { smsBalance: smsToAdd } },
      { new: true }
    );

    // שמירת התשלום למסד
    const newPayment = new Payment({
      email,
      itemName,
      amount: parseFloat(amount),
      transactionId,
    });

    await newPayment.save();

    return NextResponse.json({
      success: true,
      smsBalance: updatedUser?.smsBalance,
    });
  } catch (error) {
    console.error("❌ Error saving payment:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
