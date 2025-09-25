import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import User from "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function POST() {
  try {
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const email = session.user.email;

    await connectToDatabase();

    // שמירה למסד
    const dummyPayment = new Payment({
      email,
      itemName: "Test Package",
      amount: 25,
      transactionId: "TEST1234",
    });

    await dummyPayment.save();

    // עדכון SMS
    const result = await User.findOneAndUpdate(
      { email },
      { $inc: { smsBalance: 10 } },
      { new: true }
    );

    return NextResponse.json({
      success: true,
      updatedSmsBalance: result?.smsBalance,
    });
  } catch (error) {
    console.error("❌ Error saving payment:", error);
    return NextResponse.json({ error: "Internal error" }, { status: 500 });
  }
}
