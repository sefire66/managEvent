// app/api/auth/reset-password/route.ts

/**
 * שלב 1 – מקבל token + סיסמה חדשה → הופך ל־hash.
 * שלב 2 – בודק טוקן במסד: קיים + לא שומש + לא פג תוקף.
 * שלב 3 – מוצא את המשתמש ע"י המייל מהטוקן.
 * שלב 4 – מצפין ושומר את הסיסמה החדשה ב־User.
 * שלב 5 – מסמן את הטוקן כ־used (ואופציונלית מוחק אחרים).
 */

import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { NextResponse } from "next/server";
import bcrypt from "bcrypt";
import crypto from "crypto";

export async function POST(req: Request) {
  await connectToDatabase(); // ✅ ודא חיבור למסד
  const body = await req.json();
  const { token, newPassword } = body;

  if (!token || !newPassword) {
    return NextResponse.json(
      { error: "חסר טוקן או סיסמה חדשה" },
      { status: 400 }
    );
  }

  // === שלב 1: מקבל token + סיסמה חדשה (מתחיל כאן)
  // 🔐 לעולם לא מחפשים לפי token עצמו — תמיד לפי hash(token)
  const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
  // === שלב 1 נגמר כאן

  // === שלב 2: בודק שהטוקן קיים, לא פג תוקף ולא שומש (מתחיל כאן)
  // ⏳ בנוסף ל-expiresAt המוגדר ברשומה, יש גם TTL אינדקס במודל לטיהור עתידי
  const resetRecord = await PasswordResetToken.findOne({
    tokenHash,
    used: false,
    expiresAt: { $gt: new Date() },
  });
  if (!resetRecord) {
    // ⚠️ לא חושפים יותר מדי—פשוט מודיעים שהטוקן לא תקף/פג
    return NextResponse.json(
      { error: "הטוקן לא תקף או פג תוקף" },
      { status: 400 }
    );
  }
  // === שלב 2 נגמר כאן

  // === שלב 3: מוצא את המשתמש לפי המייל מתוך הרשומה (מתחיל כאן)
  // 📧 מאתרים לפי האימייל שנשמר ברשומת הטוקן בזמן הבקשה
  const user = await User.findOne({ email: resetRecord.userEmail });
  if (!user) {
    // 🚩 מצב נדיר (למשל אם המשתמש נמחק מאז) — עוצרים כאן
    return NextResponse.json({ error: "משתמש לא נמצא" }, { status: 400 });
  }
  // === שלב 3 נגמר כאן

  // === שלב 4: מצפין את הסיסמה החדשה ושומר אותה ב־User (מתחיל כאן)
  // 🧂 מומלץ לוודא גם מדיניות סיסמאות (אורך/מורכבות) לפני hash — אפשר בצד לקוח וגם כאן
  const hashedPassword = await bcrypt.hash(newPassword, 10); // 🔑 cost=10 (ברירת מחדל טובה לרוב)
  user.password = hashedPassword;

  // 🛡️ אופציונלי: לבטל סשנים ישנים/להכריח התחברות מחדש
  // user.passwordChangedAt = new Date(); // ← אם מוסיפים שדה כזה במודל User
  await user.save();
  // === שלב 4 נגמר כאן

  // === שלב 5: מסמן את הטוקן כ־used / מוחק אותו (מתחיל כאן)
  // ✅ מונע שימוש חוזר באותו לינק
  resetRecord.used = true;
  await resetRecord.save();

  // אופציונלי: למחוק טוקנים נוספים לאותו מייל
  // 🧹 כך נשאר רק הטוקן "שהשתמשו בו" ושאר הישנים נמחקים
  await PasswordResetToken.deleteMany({
    userEmail: resetRecord.userEmail,
    _id: { $ne: resetRecord._id },
  });
  // === שלב 5 נגמר כאן

  // 📬 אופציונלי מאוד רצוי: לשלוח מייל התראה "הסיסמה שונתה" למשתמש
  // כדי ליידע על שינוי לא צפוי; אפשר להוסיף ב-lib/email פונקציה ייעודית

  return NextResponse.json({ message: "הסיסמה אופסה בהצלחה" }, { status: 200 });
}
