import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Table from "@/models/Table";

// GET: /api/tables?email=...
export async function GET(req: Request) {
  await connectToDatabase();

  try {
    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email");
    const eventId = searchParams.get("eventId"); // ✅ הוספת eventId

    if (!email || !eventId) {
      return NextResponse.json({ error: "Missing email" }, { status: 400 });
    }

    const tables = await Table.find({ clientEmail: email, eventId });

    if (!Array.isArray(tables)) {
      console.error("Tables query did not return array:", tables);
      return NextResponse.json([], { status: 200 }); // Fallback to empty array
    }

    return NextResponse.json(tables, { status: 200 });
  } catch (err) {
    console.error("Error in GET /api/tables:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}

// POST: /api/tables
export async function POST(req: Request) {
  await connectToDatabase();
  const { tables, email, eventId } = await req.json();

  if (!email || !eventId || !Array.isArray(tables)) {
    return NextResponse.json(
      { error: "Missing email or invalid tables" },
      { status: 400 }
    );
  }

  // מחיקת שולחנות קיימים של המשתמש
  await Table.deleteMany({ clientEmail: email, eventId });

  const saved = await Table.insertMany(
    tables.map((t: any) => ({
      ...t,
      clientEmail: email,
      eventId,
    }))
  );

  return NextResponse.json(saved, { status: 200 });
}
