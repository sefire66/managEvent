// app/api/events/[id]/uncancel/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/models/Event";
import { EventDetails } from "@/app/types/types";

export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  await connectToDatabase();
  const { id } = params;
  const { ownerEmail } = await req.json();

  // (אופציונלי אך מומלץ) בדוק שאין כבר אירוע פעיל באותו תאריך/סוג/בעלים
  const current = await Event.findById(id).lean<EventDetails>();
  if (!current)
    return NextResponse.json(
      { ok: false, error: "אירוע לא נמצא" },
      { status: 404 }
    );

  const activeSameDay = await Event.findOne({
    _id: { $ne: id },
    ownerEmail: current.ownerEmail,
    eventType: current.eventType,
    date: current.date,
    isCanceled: { $ne: true },
  }).lean();

  if (activeSameDay) {
    return NextResponse.json(
      {
        ok: false,
        error:
          "כבר קיים אירוע פעיל לאותו תאריך/סוג. שנה תאריך או בטל את האירוע האחר.",
      },
      { status: 409 }
    );
  }

  // הפעלה מחדש: מסמן false ומנקה שדות ביטול
  const res = await Event.updateOne(
    { _id: id, ownerEmail, isCanceled: true },
    { $set: { isCanceled: false }, $unset: { canceledAt: 1, cancelReason: 1 } }
  );

  if (res.matchedCount === 0) {
    return NextResponse.json(
      { ok: false, error: "לא נמצא אירוע מבוטל להתאוששות" },
      { status: 404 }
    );
  }
  return NextResponse.json({ ok: true });
}
