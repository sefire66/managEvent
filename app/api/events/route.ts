import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "../../../models/Event";

// פונקציה לקיצור קישור דרך is.gd
async function shortenUrlIsGd(longUrl: string): Promise<string> {
  // קידוד כל כתובת ה-Waze לפני שליחה ל-is.gd
  const apiUrl = `https://is.gd/create.php?format=simple&url=${encodeURIComponent(longUrl)}`;
  const res = await fetch(apiUrl);

  if (!res.ok) {
    console.error("קיצור הקישור נכשל", await res.text());
    return longUrl; // במקרה של שגיאה נחזיר את המקורי
  }

  return await res.text();
}

// פונקציה ליצירת קישור Waze מקוצר
async function createShortWazeLink(address: string): Promise<string> {
  // קידוד הכתובת כדי ש-Waze יבין עברית ורווחים
  const encodedAddress = encodeURIComponent(address);

  // קישור Waze מלא כולל navigate=yes
  const wazeLong = `https://waze.com/ul?q=${encodedAddress}&navigate=yes`;

  // קיצור דרך is.gd עם קידוד מלא של כל כתובת ה-Waze
  return await shortenUrlIsGd(wazeLong);
}

/** Google Maps מקוצר */
async function createShortGoogleMapsLink(address: string): Promise<string> {
  const encodedAddress = encodeURIComponent(address);
  const googleLong = `https://www.google.com/maps/search/?api=1&query=${encodedAddress}`;
  return await shortenUrlIsGd(googleLong);
}

export async function GET(req: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const email = searchParams.get("email");

  let events;
  if (email) {
    events = await Event.find({ ownerEmail: email });
  } else {
    events = await Event.find();
  }

  return NextResponse.json(events);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const data = await req.json();

  // ─────────────────────────────────────────
  // 1) עדכון קיים (יש _id) – מטפלים כאן קודם
  // ─────────────────────────────────────────
  const id = data?._id || data?.id;
  if (id) {
    const clean = (v: any) => (typeof v === "string" ? v.trim() : v);

    // נבנה update דינמי: $set לפי מה שנשלח, ו-$unset לתמונה אם הגיע null/ריק
    const update: any = { $set: { ...data } };
    delete update.$set._id; // לא מעדכנים מזהה

    // אם עודכנה כתובת — נעדכן גם קישורים מקוצרים
    if (typeof data.address === "string" && data.address.trim()) {
      update.$set.wazeLink = await createShortWazeLink(data.address.trim());
      update.$set.googleMapsLink = await createShortGoogleMapsLink(
        data.address.trim()
      );
    }

    // נרמול שדות תמונה
    const url = clean(data.imageUrl);
    const path = clean(data.imagePath);

    if (!url) {
      delete update.$set.imageUrl;
      update.$unset = { ...(update.$unset ?? {}), imageUrl: 1 };
    }
    if (!path) {
      delete update.$set.imagePath;
      update.$unset = { ...(update.$unset ?? {}), imagePath: 1 };
    }

    const updated = await Event.findByIdAndUpdate(id, update, {
      new: true,
      runValidators: false, // חשוב כשעושים $unset על שדות שאולי מסומנים required בסכמה
    });

    return NextResponse.json(updated, { status: 200 });
  }

  // ─────────────────────────────────────────
  // 2) יצירה חדשה (אין _id) – כאן כן דורשים שדות חובה
  // ─────────────────────────────────────────
  const { ownerEmail, eventType, date, address } = data;

  if (!ownerEmail || !eventType || !date) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  // קישורים מקוצרים ב-create כשיש כתובת
  if (address) {
    data.wazeLink = await createShortWazeLink(address);
    data.googleMapsLink = await createShortGoogleMapsLink(address);
  }

  const existing = await Event.findOne({
    ownerEmail,
    eventType,
    date,
    isCanceled: { $ne: true }, // אותו עיקרון
  });
  if (existing) {
    return NextResponse.json(
      { error: "Event already exists" },
      { status: 409 }
    );
  }

  const created = await Event.create(data);
  return NextResponse.json(created, { status: 201 });
}
