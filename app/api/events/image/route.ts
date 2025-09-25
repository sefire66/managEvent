import { connectToDatabase } from "@/lib/mongodb";
import { NextResponse } from "next/server";

export async function PATCH(req: Request) {
  try {
    const { _id, imageUrl, imagePath } = await req.json();
    if (!_id)
      return NextResponse.json({ error: "Missing event ID" }, { status: 400 });

    const { db } = await connectToDatabase();
    const result = await db
      .collection("events")
      .updateOne({ _id }, { $set: { imageUrl, imagePath } });

    if (result.modifiedCount === 0) {
      return NextResponse.json(
        { error: "Event not found or not updated" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "Image updated successfully" });
  } catch (err) {
    console.error("Image update error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
