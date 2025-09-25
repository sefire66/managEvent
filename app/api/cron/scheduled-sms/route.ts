// app/api/cron/scheduled-sms/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ScheduledSms, type IScheduledSms } from "@/models/ScheduledSms";
import Event from "@/models/Event";
import Guest from "@/models/Guest";
import { SendSmsLog } from "@/models/SendSmsLog";
import { sendSmsByType } from "@/lib/sendSmsByType";
import type { SmsType } from "@/lib/generateSmsMessageByType";

export const dynamic = "force-dynamic";

/* ===== Helpers ===== */

type GuestDoc = {
  _id: string;
  name?: string;
  phone?: string;
  status?: string; // "לא ענה" | "בא" | "לא בא" | "אולי"
};

type LogRow = { guestPhone?: string };

const normalizePhone = (p?: string) => (p ?? "").replace(/\D+/g, "").trim();
const hasPhone = (g: GuestDoc) => normalizePhone(g.phone).length > 0;

function audienceForType(
  type: Exclude<SmsType, "cancel">,
  guests: GuestDoc[]
): GuestDoc[] {
  const s = (g: GuestDoc) => (g.status || "").trim();
  switch (type) {
    case "saveDate":
    case "invitation":
      // כל מי שלא "לא בא"
      return guests.filter((g) => s(g) !== "לא בא" && hasPhone(g));
    case "reminder":
      // רק "לא ענה"
      return guests.filter((g) => s(g) === "לא ענה" && hasPhone(g));
    case "tableNumber":
    case "thankYou":
      // רק "בא"
      return guests.filter((g) => s(g) === "בא" && hasPhone(g));
  }
}

function uniqueByPhone(list: GuestDoc[]): GuestDoc[] {
  const seen = new Set<string>();
  return list.filter((g) => {
    const p = normalizePhone(g.phone);
    if (!p || seen.has(p)) return false;
    seen.add(p);
    return true;
  });
}

async function filterAlreadySentByLog(
  ownerEmail: string,
  eventIdStr: string,
  smsType: Exclude<SmsType, "cancel">,
  audience: GuestDoc[]
): Promise<GuestDoc[]> {
  const rows = await SendSmsLog.find({
    ownerEmail,
    eventId: eventIdStr,
    smsType,
    status: "sent",
  })
    .select({ guestPhone: 1, _id: 0 })
    .lean<LogRow[]>()
    .exec();

  if (!rows?.length) return audience;

  const already = new Set(
    rows.map((r) => normalizePhone(r.guestPhone)).filter(Boolean)
  );
  if (!already.size) return audience;

  return audience.filter((g) => !already.has(normalizePhone(g.phone)));
}

/* ===== Handler ===== */

export async function GET() {
  await connectToDatabase();
  const now = new Date();

  let processed = 0;
  let totalSent = 0;

  // נעבד עד 20 משימות בכל הרצה
  for (let i = 0; i < 20; i++) {
    // "נעילה" ללא שינוי סכימה: נאתר pending+auto<=now ונכבה את auto באותה פעולת DB
    const job = await ScheduledSms.findOneAndUpdate(
      { status: "pending", auto: true, sendAt: { $lte: now } },
      { $set: { auto: false } },
      { sort: { sendAt: 1 }, new: true }
    )
      .lean<IScheduledSms>()
      .exec();

    if (!job) break;

    processed++;

    try {
      const event = await Event.findById(job.eventId).lean();
      if (!event || (event as any).isCanceled) {
        await ScheduledSms.updateOne(
          { _id: job._id },
          { $set: { status: "failed", updatedAt: new Date() } }
        ).exec();
        continue;
      }

      // Guests לאירוע (שים לב: אצלך Guest.eventId הוא string)
      const eventIdStr = String(job.eventId);
      const guests = await Guest.find({ eventId: eventIdStr })
        .select({ _id: 1, name: 1, phone: 1, status: 1 })
        .lean<GuestDoc[]>()
        .exec();

      // קהל יעד לפי סוג + דה־דופליקציה
      if (job.smsType === ("cancel" as SmsType)) {
        // לא אמור לקרות בקרון; רק ליתר ביטחון מסמנים ככשל
        await ScheduledSms.updateOne(
          { _id: job._id },
          { $set: { status: "failed", updatedAt: new Date() } }
        ).exec();
        continue;
      }

      let audience = uniqueByPhone(
        audienceForType(job.smsType as Exclude<SmsType, "cancel">, guests)
      );

      // דילוג על מי שכבר קיבל את אותו סוג בעבר
      audience = await filterAlreadySentByLog(
        job.ownerEmail,
        eventIdStr,
        job.smsType as Exclude<SmsType, "cancel">,
        audience
      );

      if (!audience.length) {
        // אין למי לשלוח → נסמן "failed" (או "sent" אם אתה מעדיף אחרת)
        await ScheduledSms.updateOne(
          { _id: job._id },
          { $set: { status: "failed", updatedAt: new Date() } }
        ).exec();
        continue;
      }

      // שליחה סדרתית (אפשר להחליף למקביליות מוגבלת אם תרצה)
      let sent = 0;
      for (const g of audience) {
        const ok = await sendSmsByType(
          [g] as any,
          event as any,
          job.smsType,
          job.ownerEmail
        );
        if (ok) sent += 1; // ok=true עבור נמען יחיד במערך
      }

      totalSent += sent;

      await ScheduledSms.updateOne(
        { _id: job._id },
        {
          $set: {
            status: sent > 0 ? "sent" : "failed",
            updatedAt: new Date(),
          },
        }
      ).exec();
    } catch (e) {
      await ScheduledSms.updateOne(
        { _id: job._id },
        { $set: { status: "failed", updatedAt: new Date() } }
      ).exec();
    }
  }

  return NextResponse.json({ ok: true, processed, totalSent });
}
