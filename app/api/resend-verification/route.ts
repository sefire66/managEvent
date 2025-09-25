//api/resend-verification

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const { email } = await req.json();

    if (!email) {
      return NextResponse.json(
        { error: "יש לספק כתובת אימייל" },
        { status: 400 }
      );
    }

    const user = await User.findOne({ email });

    if (!user) {
      return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 404 });
    }

    if (user.isVerified) {
      return NextResponse.json(
        { error: "האימייל הזה כבר אומת" },
        { status: 400 }
      );
    }

    // יצירת טוקן חדש
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // שעה קדימה

    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = verifyTokenExpiry;
    await user.save();

    // שליחת מייל
    await sendVerificationEmail(email, verifyToken);

    return NextResponse.json({
      message: "נשלח מייל אימות חדש לכתובת שסיפקת.",
    });
  } catch (error) {
    console.error("שגיאה בשליחת מייל אימות מחדש:", error);
    return NextResponse.json({ error: "אירעה שגיאה בשרת" }, { status: 500 });
  }
}
