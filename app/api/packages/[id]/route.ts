// app/api/packages/[id]/route.ts  (או הנתיב שבו הקובץ אצלך)
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Package from "@/models/Package";
import mongoose from "mongoose";

export async function PUT(req: Request, context: any) {
  await connectToDatabase();

  const { price, smsAmount } = await req.json();
  const { id } = (context?.params ?? {}) as { id: string };

  if (price == null || smsAmount == null) {
    return NextResponse.json(
      { error: "Missing required fields" },
      { status: 400 }
    );
  }

  if (!id || !mongoose.Types.ObjectId.isValid(id)) {
    return NextResponse.json({ error: "Invalid package id" }, { status: 400 });
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
