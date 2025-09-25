import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";
import { NextResponse } from "next/server";
export const PATCH = async (
  req: Request,
  { params }: { params: { id: string } }
) => {
  const id = params.id;
  console.log("📦 Received params:", params);

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
      console.log("✅ Updated guest SMS info:", id);
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("❌ Update guest SMS info failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
};
