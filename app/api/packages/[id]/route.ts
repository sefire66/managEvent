import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Package from "@/models/Package";

export async function PUT(req: Request, context: { params: { id: string } }) {
  await connectToDatabase();

  const { price, smsAmount } = await req.json();
  const { id } = await context.params;

  if (price == null || smsAmount == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  const updatedPackage = await Package.findByIdAndUpdate(
    id,
    { price, smsAmount },
    { new: true }
  );

  if (!updatedPackage) {
    return NextResponse.json({ error: "Package not found" }, { status: 404 });
  }

  return NextResponse.json(updatedPackage);
}
