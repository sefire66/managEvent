import { NextResponse } from 'next/server';
import { connectToDatabase } from '@/lib/mongodb';
// If your Guest model is in a TypeScript or JavaScript file, include the extension if needed:
// import Guest from "../../models/Guest"; // TypeScript will resolve .ts automatically

// If you still get an error, try specifying the extension:
//
  import Guest from "../../../models/Guest"; // If using JavaScript, ensure the extension is included

// or
// import Guest from "../../models/Guest.js";


// GET: /api/guests?sortBy=name&sortOrder=asc
export async function GET(req: Request) {
  await connectToDatabase();

  const { searchParams } = new URL(req.url);
  const sortBy = searchParams.get('sortBy') || 'name';
  const sortOrder = searchParams.get('sortOrder') === 'desc' ? -1 : 1;

  const sortOptions: Record<string, 1 | -1> = {};
  sortOptions[sortBy] = sortOrder;

  const guests = await Guest.find().sort(sortOptions);
  return NextResponse.json(guests);
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
