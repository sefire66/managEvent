// app/api/users/[id]/send-password-reset/route.ts

/* =======================
 * חלק 1: ייבוא תלותים והגדרות
 * ======================= */
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import PasswordResetToken from "@/models/PasswordResetToken";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";
import crypto from "crypto";
import { sendResetEmail } from "@/lib/email";

/* אפשרות: לקבוע זמן תפוגה לטוקן (דקות) */
const RESET_TOKEN_TTL_MINUTES = 60;

/* =========================================
 * חלק 2: בדיקת הרשאות (admin/super-admin)
 * ========================================= */
async function requireAdmin() {
  const session = await getServerSession(authOptions);
  const role = (session as any)?.user?.role as string | undefined;
  if (!session || !role || !["admin", "super-admin"].includes(role)) {
    return null;
  }
  return session;
}

/* ============================================================
 * חלק 3: פונקציית עזר – חילוץ IP ו-User-Agent לתיעוד (Audit)
 * ============================================================ */
function extractClientMeta(req: Request) {
  const ip = req.headers.get("x-forwarded-for") || (req as any).ip || undefined;
  const userAgent = req.headers.get("user-agent") || undefined;
  // במקרה ויש רשימת IPs ב-x-forwarded-for ניקח את הראשון
  const requestedIp = ip?.split(",")[0]?.trim();
  return { requestedIp, userAgent };
}

/* ======================================================================================
 * חלק 4: ה-Handler הראשי – יצירת טוקן איפוס ושליחת המייל (לפי userId שמגיע בפרמטרים)
 * ====================================================================================== */
export async function POST(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    // 4.1 – חיבור למסד
    await connectToDatabase();

    // 4.2 – הרשאות אדמין
    const session = await requireAdmin();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    // 4.3 – קריאת פרמטרים
    const { id } = await context.params;

    // 4.4 – מציאת המשתמש היעד
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    if (!user.email) {
      return NextResponse.json(
        { error: "Target user has no email address" },
        { status: 400 }
      );
    }

    // 4.5 – יצירת טוקן אקראי ושיגור hash למסד
    const token = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex");

    const expiresAt = new Date(
      Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000
    );

    // 4.6 – ניקוי טוקנים קודמים לאותו מייל (כדי לא להשאיר רבים פעילים)
    await PasswordResetToken.deleteMany({
      userEmail: user.email.toLowerCase(),
    });

    // 4.7 – שמירת רשומת הטוקן עם מטא־דאטה
    const { requestedIp, userAgent } = extractClientMeta(req);
    await PasswordResetToken.create({
      userEmail: user.email.toLowerCase(),
      tokenHash,
      expiresAt,
      used: false,
      requestedIp,
      userAgent,
    });

    // 4.8 – שליחת המייל עם הטוקן הגולמי (DB שומר hash בלבד)
    const resetUrl = `${process.env.NEXT_PUBLIC_SITE_URL}/reset-password?token=${token}`;
    await sendResetEmail(user.email, resetUrl);

    // 4.9 – תשובת הצלחה (אינפורמטיבית כי זה ראוט אדמין)
    return NextResponse.json(
      {
        message: "נשלח קישור איפוס סיסמה למשתמש",
        targetEmail: user.email,
        expiresAt,
      },
      { status: 200 }
    );
  } catch (err: any) {
    // 4.10 – טיפול בשגיאות כלליות
    console.error("send-password-reset error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal Server Error" },
      { status: 500 }
    );
  }
}

/* ======================================================
 * חלק 5 (אופציונלי): אפשר להוסיף Rate-Limit בהמשך
 * ======================================================
 * מומלץ להגן על הראוט ברמה תפעולית (IP/email-based throttling),
 * כדי למנוע שליחת ספאם/הטרדה דרך הפאנל האדמיני.
 */
