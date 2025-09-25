// app/api/guests/bulk/route.ts

import { connectToDatabase } from "@/lib/mongodb";
import Guest from "@/models/Guest";
import { NextResponse } from "next/server";

export async function POST(req: Request) {
  await connectToDatabase();
  const body = await req.json();

  const { guests, ownerEmail, eventId } = body;

  if (!ownerEmail || !Array.isArray(guests) || !eventId) {
    return NextResponse.json(
      { error: "Missing ownerEmail or invalid guests" },
      { status: 400 }
    );
  }

  const validGuests = guests.filter((g: any) => g.name && g.phone);
  const skippedGuests = guests.length - validGuests.length;

  // מחיקת כל האורחים של המשתמש ללא תלות ב-eventId
  await Guest.deleteMany({ ownerEmail, eventId });

  // הוספת מזהים לכל אורח
  const guestsWithMeta = validGuests.map((g: any) => ({
    ...g,
    ownerEmail,
    eventId,
  }));

  await Guest.insertMany(guestsWithMeta);

  console.log(
    `✅ Saved ${validGuests.length} guests, skipped ${skippedGuests}`
  );
  return NextResponse.json(
    { message: "Guests saved successfully" },
    { status: 200 }
  );
}
