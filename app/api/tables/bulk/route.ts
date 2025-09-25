import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Table from "@/models/Table";

// POST - Save tables for a specific user
export async function POST(req: Request) {
  try {
    await connectToDatabase();
    const { tables, email, eventId } = await req.json();

    if (!email || !eventId || !Array.isArray(tables)) {
      return NextResponse.json(
        { error: "Missing email or invalid tables" },
        { status: 400 }
      );
    }

    // Delete old tables for this user
    await Table.deleteMany({ clientEmail: email, eventId });

    const tablesWithEventId = tables.map((t: any) => ({
      ...t,
      ownerEmail: email,
      eventId,
    }));

    // Insert new tables
    const saved = await Table.insertMany(
      tablesWithEventId.map((t: any) => ({
        number: t.number,
        totalSeats: t.totalSeats,
        clientEmail: email,
        eventId: t.eventId,
        note: typeof t.note === "string" ? t.note : "",
      }))
    );

    return NextResponse.json(saved, { status: 200 });
  } catch (err) {
    console.error("❌ Error in POST /api/tables/bulk:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}

// GET - Fetch tables for a specific user
export async function GET(req: Request) {
  try {
    await connectToDatabase();
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const eventId = searchParams.get("eventId"); // ✅ נקבל eventId מה-query
    if (!email) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const tables = await Table.find({ clientEmail: email, eventId: eventId });

    return NextResponse.json(tables);
  } catch (err) {
    console.log("❌ Error in GET /api/tables/bulk:", err);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
