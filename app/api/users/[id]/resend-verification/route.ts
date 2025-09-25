import { NextResponse } from "next/server";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // בדיקת הרשאות - אדמין/סופראדמין בלבד
    const session = await getServerSession(authOptions);
    const role = (session as any)?.user?.role as string | undefined;
    if (!session || !role || !["admin", "super-admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // מסמן לא מאומת + יוצר טוקן ותוקף חדש
    const verifyToken = crypto.randomBytes(32).toString("hex");
    const verifyTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // שעה קדימה

    user.isVerified = false;
    user.verifyToken = verifyToken;
    user.verifyTokenExpiry = verifyTokenExpiry;

    await user.save();

    // שליחת מייל אימות לכתובת הנוכחית של המשתמש
    await sendVerificationEmail(user.email, verifyToken);

    return NextResponse.json({
      message: "נשלח מייל אימות מחדש ונקבע isVerified=false למשתמש.",
    });
  } catch (error: any) {
    console.error("resend-verification error:", error);
    return NextResponse.json(
      { error: error?.message || "Server error" },
      { status: 500 }
    );
  }
}
