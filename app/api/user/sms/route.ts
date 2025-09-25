import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { email } = await req.json();

    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    await connectToDatabase();

    const result = await User.updateOne(
      { email },
      { $inc: { smsUsed: 1, smsBalance: -1 } }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("Update smsUsed failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
