import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";

export async function POST(req: Request) {
  try {
    const { guestId, status, count } = await req.json();

    if (!guestId || !status) {
      return NextResponse.json(
        { error: "Missing guestId or status" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const updateData: any = { status };

    // ✅ If count was included and is a number, update it too
    if (typeof count === "number" && count > 0) {
      updateData.count = count;
    }

    const result = await Guest.updateOne(
      { _id: guestId },
      { $set: updateData }
    );

    if (result.modifiedCount === 1) {
      return NextResponse.json({ success: true });
    } else {
      return NextResponse.json({ error: "Guest not found" }, { status: 404 });
    }
  } catch (error) {
    console.error("RSVP update error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
