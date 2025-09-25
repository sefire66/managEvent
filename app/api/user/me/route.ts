import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextResponse } from "next/server";
import User from "@/models/User"; // ודא שזה הנתיב למודל שלך
import { connectToDatabase } from "@/lib/mongodb"; // אם אתה צריך להתחבר ידנית

export async function GET() {
  await connectToDatabase(); // אם אתה צריך את זה אצלך בפרויקט

  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const user = await User.findOne({ email: session.user.email });
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json({
    name: user.name,
    email: user.email,
    role: user.role,
    smsBalance: user.smsBalance,
    smsUsed: user.smsUsed,
    subscriptionType: user.subscriptionType,
  });
}
