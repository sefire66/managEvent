import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Guest from "../../../models/Guest";

export async function GET(req: Request) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const eventId = searchParams.get("eventId");

    if (!email || !eventId) {
      return NextResponse.json(
        { error: "Missing email or eventId" },
        { status: 400 }
      );
    }

    const guests = await Guest.find({ ownerEmail: email, eventId });

    if (!Array.isArray(guests)) {
      console.error("Guest query did not return an array:", guests);
      return NextResponse.json([], { status: 200 }); // fallback to empty array
    }

    return NextResponse.json(guests, { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/guests:", err);
    return NextResponse.json([], { status: 500 }); // fallback to empty array on error
  }
}

// POST: /api/guests
export async function POST(req: Request) {
  await connectToDatabase();
  const data = await req.json();

  try {
    const newGuest = await Guest.create(data);
    return NextResponse.json(newGuest, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
