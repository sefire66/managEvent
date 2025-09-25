// app/api/events/[id]/cancel/route.ts

// === ייבוא תלותים וחיבור למסד ===
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/models/Event";

// === Handler: ביטול אירוע (POST /api/events/:id/cancel) ===
export async function POST(
  req: Request,
  { params }: { params: { id: string } }
) {
  // === התחברות למסד הנתונים ===
  await connectToDatabase();

  // === קליטת פרמטרים מהנתיב וגוף הבקשה ===
  const { id } = params;
  const { ownerEmail, reason } = await req.json();

  // === עדכון האירוע: סימון isCanceled=true (רק אם טרם בוטל) ===
  const res = await Event.updateOne(
    { _id: id, ownerEmail, isCanceled: { $ne: true } }, // יעדכן רק אם עוד לא בוטל
    {
      $set: {
        isCanceled: true,
        canceledAt: new Date(),
        ...(reason?.trim() && { cancelReason: reason.trim() }),
      },
    }
  );

  // === בדיקת תוצאה והחזרת שגיאה אם לא נמצא אירוע מתאים ===
  if (res.matchedCount === 0) {
    return NextResponse.json(
      { ok: false, error: "לא נמצא אירוע מתאים (או שכבר בוטל)" },
      { status: 404 }
    );
  }

  // === הצלחה ===
  return NextResponse.json({ ok: true });
}
