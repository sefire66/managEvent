// api/users
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";
import { sendVerificationEmail } from "@/lib/email";

const smsBalances: Record<string, number> = {
  free: 0,
  basic: 50,
  premium: 200,
  enterprise: 1000,
};

export async function GET() {
  await connectToDatabase();
  const users = await User.find();
  return NextResponse.json(users);
}

export async function POST(req: Request) {
  await connectToDatabase();
  const body = await req.json();

  const existingUser = await User.findOne({ email: body.email });

  // 🧾 אם המשתמש כבר קיים – לא מאשרים הרשמה מחדש ולא שולחים מייל שוב
  if (existingUser) {
    return NextResponse.json(
      { error: "האימייל הזה כבר רשום במערכת, נסה להתחבר" },
      { status: 400 }
    );
  }

  // 🆕 יצירת משתמש חדש
  const hashedPassword = await bcrypt.hash(body.password, 10);
  const subscriptionType = body.subscriptionType || "free";

  const verifyToken = crypto.randomBytes(32).toString("hex");
  const verifyTokenExpiry = new Date(Date.now() + 1000 * 60 * 60); // שעה קדימה

  const newUser = await User.create({
    name: body.name,
    email: body.email,
    phone: body.phone,
    password: hashedPassword,
    role: body.role || "client",
    subscriptionType,
    smsBalance: smsBalances[subscriptionType],
    smsUsed: 0,
    isActive: true,
    lastLogin: new Date(),
    isVerified: false,
    verifyToken,
    verifyTokenExpiry,
  });

  await sendVerificationEmail(newUser.email, verifyToken);

  return NextResponse.json(
    { message: "נרשמת בהצלחה! נשלח מייל לאימות לכתובת שלך." },
    { status: 201 }
  );
}
