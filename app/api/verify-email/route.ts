// api/verify-email

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const token = url.searchParams.get("token");

    if (!token) {
      return NextResponse.json(
        { error: "טוקן אימות לא סופק." },
        { status: 400 }
      );
    }

    const user = await User.findOne({ verifyToken: token });

    if (!user) {
      return NextResponse.json(
        { error: "טוקן לא תקף או שהמשתמש לא קיים." },
        { status: 404 }
      );
    }

    if (!user.verifyTokenExpiry || user.verifyTokenExpiry < new Date()) {
      return NextResponse.json(
        { error: "הטוקן פג תוקף. אנא בקש שליחה מחדש." },
        { status: 400 }
      );
    }

    user.isVerified = true;
    user.verifyToken = undefined;
    user.verifyTokenExpiry = undefined;
    await user.save();

    return NextResponse.json({
      message: "האימייל אומת בהצלחה!",
      email: user.email, // ✅ מחזיר את כתובת האימייל כדי להעביר ל-login
    });
  } catch (error) {
    console.error("שגיאה באימות טוקן:", error);
    return NextResponse.json({ error: "אירעה שגיאה באימות." }, { status: 500 });
  }
}
