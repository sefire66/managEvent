// app/api/auth/forgot-password/route.ts
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { NextResponse } from "next/server";
import crypto from "crypto";
import { sendResetEmail } from "@/lib/email"; // ⬅️ פונקציה שתשלח מייל עם הלינק

export async function POST(req: Request) {
  await connectToDatabase(); // ✅ ודא חיבור למסד לפני כל פעולה
  const body = await req.json();
  const email = body.email?.toLowerCase().trim();

  if (!email) {
    return NextResponse.json({ error: "נדרש כתובת אימייל" }, { status: 400 });
  }

  const user = await User.findOne({ email });
  // תמיד מחזירים תשובה כללית כדי לא לחשוף אם האימייל רשום
  // ⚠️ זו פרקטיקה למניעת user enumeration (איתור מיילים רשומים)
  if (!user) {
    return NextResponse.json(
      { message: "אם המייל קיים, נשלח אליו לינק לאיפוס" },
      { status: 200 }
    );
  }

  // יצירת טוקן
  // ✅ token אקראי חזק (256 ביט), נשלח למשתמש; ב-DB נשמור רק hash שלו
  const token = crypto.randomBytes(32).toString("hex");
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60); // שעה קדימה
  // ⏳ מומלץ טווח תוקף קצר (15–60 דק')—כאן 60 דק' בהתאם לצורך

  // מחיקת טוקנים קודמים לאותו מייל (שלא יהיו כפילויות)
  // 🧹 שומר על טבלה נקייה ומונע כמה לינקים פעילים בו-זמנית לאותו משתמש
  await PasswordResetToken.deleteMany({ userEmail: email });

  // יצירת רשומת טוקן חדשה
  // 📝 רצוי לשמור גם מטא־דאטה של IP/User-Agent (אם תרצה: req.headers)
  await PasswordResetToken.create({
    userEmail: email,
    tokenHash,
    expiresAt,
    used: false,
    // requestedIp: req.headers.get("x-forwarded-for") ?? undefined, // ← אופציונלי
    // userAgent: req.headers.get("user-agent") ?? undefined,        // ← אופציונלי
  });

  // שליחת מייל עם לינק (הלינק מכיל את ה־token הגולמי, לא את ה־hash)
  // ✅ בשרת נשווה את hash(token) לרשומה—לכן אין לשמור את token עצמו במסד
  const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
  await sendResetEmail(email, resetUrl);

  // ✅ תמיד מחזירים הודעה זהה, בלי לחשוף אם המשתמש קיים
  // 🔒 מומלץ לשים Rate-Limit לנתיב הזה (לפי IP+email) כדי למנוע ספאם
  return NextResponse.json(
    { message: "אם המייל קיים, נשלח אליו לינק לאיפוס" },
    { status: 200 }
  );
}
