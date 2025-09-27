// app/api/guest/[id]/sms/route.ts
import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

export async function PATCH(req: Request, context: any) {
  const { id } = (context?.params ?? {}) as { id: string };

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid guest id" }, { status: 400 });
  }

  try {
    await connectToDatabase();

    const result = await Guest.updateOne(
      { _id: id },
      {
        $set: { lastSms: new Date().toISOString() },
        $inc: { smsCount: 1 },
      }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("❌ Update guest SMS info failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
