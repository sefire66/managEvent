// app/api/guests/route.ts

import { connectToDatabase } from '@/lib/mongodb';
import Guest from '@/models/Guest';
import { NextResponse } from 'next/server';

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const email = searchParams.get('email');

  if (!email) {
    return NextResponse.json({ error: 'Missing email' }, { status: 400 });
  }

  await connectToDatabase();
  const guests = await Guest.find({ ownerEmail: email });

  return NextResponse.json(guests);
}
