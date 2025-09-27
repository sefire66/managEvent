// app/api/events/[id]/cancel/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/models/Event";
import mongoose from "mongoose";
import { ScheduledSms } from "@/models/ScheduledSms";

export const dynamic = "force-dynamic";

export async function POST(req: Request, context: any) {
  // עוקפים קונפליקט טיפוסים גלובלי: מוציאים את id בצורה ידנית מ-context
  const { id } = (context?.params ?? {}) as { params?: { id: string } } as {
    id: string;
  };

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "מזהה אירוע לא תקין" }, { status: 400 });
  }

  await connectToDatabase();

  const { ownerEmail, reason } = (await req.json().catch(() => ({}))) as {
    ownerEmail?: string;
    reason?: string;
  };

  if (!ownerEmail) {
    return NextResponse.json({ error: "ownerEmail דרוש" }, { status: 400 });
  }

  const session = await mongoose.startSession();
  await session.startTransaction();

  try {
    // 1) מוצאים את האירוע במסגרת הטרנזקציה
    const event = await Event.findOne({ _id: id, ownerEmail }).session(session);
    if (!event) {
      throw new Error("האירוע לא נמצא");
    }

    // אם כבר בוטל — נסיים יפה (לא ניגע בתיזמונים שוב)
    if ((event as any).isCanceled) {
      await session.commitTransaction();
      return NextResponse.json(
        {
          ok: true,
          event,
          note: "האירוע כבר מסומן כמבוטל",
          deletedScheduledCount: 0,
        },
        { status: 200 }
      );
    }

    // 2) מסמנים את האירוע כמבוטל
    (event as any).isCanceled = true;
    (event as any).canceledAt = new Date();
    if (typeof reason === "string" && reason.trim()) {
      (event as any).cancelReason = reason.trim();
    }
    await event.save({ session });

    // 3) מוחקים את כל התיזמונים של האירוע (מסונן גם לפי ownerEmail)
    const delRes = await ScheduledSms.deleteMany(
      { eventId: String(id), ownerEmail },
      { session }
    );

    // 4) סוגרים טרנזקציה
    await session.commitTransaction();

    // 5) מחזירים את האירוע המעודכן + כמה נמחקו
    const updated = await Event.findById(id).lean();
    return NextResponse.json(
      {
        ok: true,
        event: updated,
        deletedScheduledCount: delRes.deletedCount ?? 0,
      },
      { status: 200 }
    );
  } catch (err: any) {
    await session.abortTransaction();
    return NextResponse.json(
      { ok: false, error: err?.message ?? "Unknown error" },
      { status: 400 }
    );
  } finally {
    session.endSession();
  }
}
