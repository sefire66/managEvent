import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";
import { NextResponse } from "next/server";

export async function PATCH(
  req: Request,
  context: { params: { id: string } } // ✅ תיקון כאן
) {
  const { id } = context.params;

  try {
    await connectToDatabase();

    const result = await Guest.updateOne(
      { _id: id }, // ✅ אם _id הוא UUID אין צורך ב-ObjectId
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
    console.error("Update guest SMS info failed:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
