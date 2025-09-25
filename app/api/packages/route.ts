import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Package from "@/models/Package";

export async function GET() {
  await connectToDatabase();
  const packages = await Package.find();
  return NextResponse.json(packages);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const { name, price, smsAmount } = await req.json();

  if (!name || price == null || smsAmount == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  try {
    const created = await Package.create({ name, price, smsAmount });
    return NextResponse.json(created, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
