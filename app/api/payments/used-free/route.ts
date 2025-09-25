// /app/api/payments/used-free/route.ts
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { NextResponse } from "next/server";

export async function GET() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.email) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  await connectToDatabase();

  const alreadyUsed = await Payment.findOne({
    email: session.user.email,
    transactionId: "free",
  });

  return NextResponse.json({ used: !!alreadyUsed });
}
