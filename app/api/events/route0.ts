import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "../../../models/Event";

export async function GET(req: Request) {
  let events;
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  if (email) {
    events = await Event.find({ ownerEmail: email });
  } else {
    // ⬅️ אם אין אימייל - נחזיר את כל האירועים
    events = await Event.find();
  }
  // const events = await Event.find({ ownerEmail: email });

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const data = await req.json();

  const { ownerEmail, eventType, date, address } = data;
  if (!ownerEmail || !eventType || !date) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (address) {
    const encodedAddress = encodeURIComponent(address);
    data.googleMapsLink = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
    data.wazeLink = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;
  }

  // Check for existing event for this user/type/date
  if (data._id) {
    // עדכון קיים לפי _id
    const updated = await Event.findByIdAndUpdate(data._id, data, {
      new: true,
    });
    return NextResponse.json(updated, { status: 200 });
  } else {
    // יצירה חדשה, נוודא שלא קיים כפול
    const existing = await Event.findOne({ ownerEmail, eventType, date });
    if (existing) {
      return NextResponse.json(
        { error: "Event already exists" },
        { status: 409 }
      );
    }

    const created = await Event.create(data);
    return NextResponse.json(created, { status: 201 });
  }

  try {
    const created = await Event.create(data);
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
