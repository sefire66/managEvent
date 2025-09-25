// app/api/scheduledSms/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import { ScheduledSms } from "@/models/ScheduledSms";

// GET ?eventId=&ownerEmail=
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const ownerEmail = searchParams.get("ownerEmail");

    if (!eventId || !ownerEmail) {
      return NextResponse.json(
        { error: "Missing eventId or ownerEmail" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const rows = await ScheduledSms.find(
      { eventId, ownerEmail },
      { _id: 0, smsType: 1, sendAt: 1, auto: 1 }
    )
      .sort({ smsType: 1 })
      .lean();

    return NextResponse.json(rows, { status: 200 });
  } catch (error) {
    console.error("ScheduledSms GET error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST — יצירה/עדכון מלא (sendAt + auto=true)
export async function POST(req: Request) {
  try {
    const { eventId, smsType, sendAt, auto, ownerEmail } = await req.json();

    if (!eventId || !smsType || !sendAt || !ownerEmail) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await ScheduledSms.updateOne(
      { eventId, smsType },
      {
        $set: {
          sendAt: new Date(sendAt),
          auto: !!auto,
          ownerEmail,
          status: "pending",
        },
      },
      { upsert: true }
    );

    return NextResponse.json(
      { message: "Scheduled SMS saved", result },
      { status: 201 }
    );
  } catch (error) {
    console.error("ScheduledSms POST error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// PATCH — עדכון חלקי (sendAt? auto?)
export async function PATCH(req: Request) {
  try {
    const { eventId, ownerEmail, smsType, sendAt, auto } = await req.json();

    if (!eventId || !ownerEmail || !smsType) {
      return NextResponse.json(
        { error: "Missing eventId/ownerEmail/smsType" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const $set: any = { ownerEmail };
    if (typeof auto === "boolean") $set.auto = auto;
    if (sendAt) $set.sendAt = new Date(sendAt);

    const result = await ScheduledSms.updateOne(
      { eventId, smsType },
      { $set },
      { upsert: true }
    );

    return NextResponse.json({ ok: true, result }, { status: 200 });
  } catch (error) {
    console.error("ScheduledSms PATCH error:", error);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// DELETE ?eventId=&smsType=
export async function DELETE(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const eventId = searchParams.get("eventId");
    const smsType = searchParams.get("smsType");

    if (!eventId || !smsType) {
      return NextResponse.json(
        { error: "Missing eventId or smsType" },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const result = await ScheduledSms.deleteOne({
      eventId,
      smsType,
    });

    if (result.deletedCount === 1) {
      return NextResponse.json({ message: "Scheduled SMS deleted" });
    } else {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }
  } catch (err) {
    console.error("ScheduledSms DELETE error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
