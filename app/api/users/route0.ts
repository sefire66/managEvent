import { connectToDatabase } from "@/lib/mongodb";
import Client from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";

export async function GET() {
  await connectToDatabase();
  const clients = await Client.find();
  return NextResponse.json(clients);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const body = await req.json();

  const hashedPassword = await bcrypt.hash(body.password, 10); // ✅ hash it here

  const newClient = await Client.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    password: hashedPassword, // ✅ use hashed password
  });
  return NextResponse.json(newClient, { status: 201 });
}
