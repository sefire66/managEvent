import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { SendSmsLog } from "@/models/SendSmsLog"; // במודל עצמו guestId/eventId צריכים להיות String

// POST – יצירת לוג(ים) בלי casting ל-ObjectId
export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const body = await req.json();
    const isArray = Array.isArray(body);
    const items = isArray ? body : [body];

    for (const item of items) {
      const { guestName, eventId, smsType, status, sentAt, ownerEmail } =
        item || {};
      if (!eventId || !smsType || !status || !ownerEmail) {
        return NextResponse.json({ error: "חסרים שדות חובה" }, { status: 400 });
      }
    }

    const docs = items.map((item: any) => ({
      guestName: String(item.guestName), // ← שומר כמחרוזת
      guestPhone: String(item.guestPhone), // ← שומר כמחרוזת, אם יש
      eventId: String(item.eventId), // ← שומר כמחרוזת
      smsType: item.smsType, // "saveDate" | "invitation" | ...
      status: item.status, // "sent" | "failed"
      sentAt: item.sentAt ? new Date(item.sentAt) : new Date(),
      ownerEmail: String(item.ownerEmail),
    }));

    const saved = await SendSmsLog.insertMany(docs);
    return NextResponse.json(isArray ? saved : saved[0], { status: 200 });
  } catch (err) {
    console.error("❌ שגיאה ב־POST /api/sms-log:", err);
    return NextResponse.json({ error: "שגיאת שרת פנימית" }, { status: 500 });
  }
}

// GET – שליפה לפי ownerEmail + eventId כמחרוזות, אופציונלי guestId/smsType
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    // קוראים ownerEmail; משאירים תאימות אם מישהו שולח email
    const ownerEmail =
      searchParams.get("ownerEmail") || searchParams.get("email") || "";
    const eventId = searchParams.get("eventId") || "";
    const guestPhone = searchParams.get("guestPhone") || "";
    const smsType = searchParams.get("smsType") || "";

    if (!ownerEmail || !eventId) {
      return NextResponse.json(
        { error: "חסר ownerEmail או מזהה אירוע" },
        { status: 400 }
      );
    }

    const query: any = {
      ownerEmail: String(ownerEmail),
      eventId: String(eventId),
    };

    // ✅ סינון לפי אורח – אם יש guestPhone נשתמש בו
    if (guestPhone) query.guestPhone = String(guestPhone);

    if (smsType) query.smsType = smsType;

    const logs = await SendSmsLog.find(query).sort({ sentAt: -1 }).lean();
    return NextResponse.json(logs, { status: 200 });
  } catch (err) {
    console.error("❌ שגיאה ב־GET /api/sms-log:", err);
    return NextResponse.json({ error: "שגיאת שרת פנימית" }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    // קבל ownerEmail; השאר תאימות אם מישהו עדיין שולח email
    const ownerEmail =
      searchParams.get("ownerEmail") || searchParams.get("email") || "";
    const eventId = searchParams.get("eventId") || "";

    if (!ownerEmail || !eventId) {
      return NextResponse.json(
        { error: "חסר ownerEmail או מזהה אירוע" },
        { status: 400 }
      );
    }

    const { deletedCount } = await SendSmsLog.deleteMany({
      ownerEmail: String(ownerEmail),
      eventId: String(eventId),
    });

    return NextResponse.json({ deletedCount }, { status: 200 });
  } catch (err) {
    console.error("❌ DELETE /api/sms-log:", err);
    return NextResponse.json({ error: "שגיאת שרת פנימית" }, { status: 500 });
  }
}
