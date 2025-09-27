// app/api/guests/[id]/route.ts
import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";
import mongoose from "mongoose";
import { NextResponse } from "next/server";

const ALLOWED_STATUS = new Set(["לא ענה", "בא", "לא בא", "אולי"]);

export async function PATCH(req: Request, context: any) {
  const { id } = (context?.params ?? {}) as { id: string };

  try {
    await connectToDatabase();

    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
      return NextResponse.json(
        { error: "מזהה אורח (_id) לא תקין או חסר" },
        { status: 400 }
      );
    }

    const body = await req.json();
    const { eventId, name, phone, status, count, table } = body || {};

    // בונים $set רק מהשדות שנשלחו
    const update: Record<string, any> = {};

    if (typeof name === "string") update.name = name.trim();
    if (typeof phone === "string") update.phone = phone.trim();

    if (typeof status === "string") {
      if (!ALLOWED_STATUS.has(status)) {
        return NextResponse.json({ error: "סטטוס לא חוקי" }, { status: 400 });
      }
      update.status = status;

      // אם הסטטוס אינו "בא" – מאפסים count ושולחן
      if (status !== "בא") {
        update.count = 0;
        update.table = "";
      }
    }

    // count/table רלוונטיים רק כש"בא"
    if (typeof count !== "undefined" && update.status === "בא") {
      const c = Number(count);
      update.count = Number.isFinite(c) ? Math.max(1, c) : 1;
    }
    if (typeof table !== "undefined" && update.status === "בא") {
      update.table = table ? String(table) : "";
    }

    if (Object.keys(update).length === 0) {
      return NextResponse.json(
        { error: "לא נשלחו שדות לעדכון" },
        { status: 400 }
      );
    }

    // מומלץ לסנן לפי eventId אם הגיע — כדי למנוע עדכון צולב אירועים
    const filter: Record<string, any> = { _id: id };
    if (eventId) filter.eventId = eventId;

    const updated = await Guest.findOneAndUpdate(
      filter,
      { $set: update },
      { new: true }
    );

    if (!updated) {
      return NextResponse.json(
        { error: "האורח לא נמצא (או eventId לא תואם)" },
        { status: 404 }
      );
    }

    return NextResponse.json(updated);
  } catch (err) {
    console.error("❌ PATCH /guests/[id] error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
