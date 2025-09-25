// app/api/users/[id]/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { getServerSession } from "next-auth/next";
import { authOptions } from "@/lib/auth";

const smsBalances: Record<string, number> = {
  free: 10,
  basic: 50,
  premium: 200,
  enterprise: 1000,
};

// נייד ישראלי בלבד: 10 ספרות, מתחיל ב-05
const IL_MOBILE_REGEX = /^05\d{8}$/;

export async function PUT(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  await connectToDatabase();

  const body = await req.json();
  const { role, subscriptionType, addSms } = body;
  const { id } = await context.params;
  const updateData: Record<string, any> = {};

  if (typeof role === "string") {
    if (!["client", "admin", "super-admin"].includes(role)) {
      return NextResponse.json({ error: "Invalid role" }, { status: 400 });
    }
    updateData.role = role;
  }

  if (typeof subscriptionType === "string") {
    if (!Object.prototype.hasOwnProperty.call(smsBalances, subscriptionType)) {
      return NextResponse.json(
        { error: "Invalid subscription type" },
        { status: 400 }
      );
    }
    updateData.subscriptionType = subscriptionType;
    updateData.smsBalance = smsBalances[subscriptionType];
  }

  if (typeof addSms === "number") {
    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    user.smsBalance = (user.smsBalance ?? 0) + addSms;
    await user.save();
    return NextResponse.json(user);
  }

  if ("isActive" in body) {
    if (typeof body.isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isActive (must be boolean)" },
        { status: 400 }
      );
    }
    updateData.isActive = body.isActive;
  }

  const updatedUser = await User.findByIdAndUpdate(id, updateData, {
    new: true,
    runValidators: true,
  });

  if (!updatedUser) {
    return NextResponse.json({ error: "User not found" }, { status: 404 });
  }

  return NextResponse.json(updatedUser);
}

/* === PATCH – עדכון דיפרנציאלי (ללא שינוי אימייל) + הרשאות אדמין === */
/* === PATCH – עדכון דיפרנציאלי (ללא שינוי אימייל) + הרשאות אדמין === */
export async function PATCH(
  req: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    await connectToDatabase();

    // הרשאות: admin/super-admin בלבד
    const session = await getServerSession(authOptions);
    const role = (session as any)?.user?.role as string | undefined;
    if (!session || !role || !["admin", "super-admin"].includes(role)) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const { id } = await context.params;
    const patch = await req.json(); // מגיע רק מה שהשתנה

    const user = await User.findById(id);
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    // לא מאפשרים שינוי אימייל ב-PATCH
    if ("email" in patch) {
      return NextResponse.json(
        {
          error:
            "Email change is not allowed. Use resend verification endpoint instead.",
        },
        { status: 400 }
      );
    }

    // ❗ לא מאפשרים לעדכן שדות מחושבים/מצטברים מה-UI
    if ("paymentsTotal" in patch) {
      return NextResponse.json(
        { error: "paymentsTotal is read-only" },
        { status: 400 }
      );
    }

    // ⬅️ הוספנו 'note' לרשימת השדות המותרים
    const allowed = [
      "name",
      "phone",
      "role",
      "subscriptionType",
      "isActive",
      "smsBalance",
      "smsUsed",
      "note", // ← חדש
    ] as const;

    const updateData: Record<string, any> = {};
    for (const key of Object.keys(patch)) {
      if (allowed.includes(key as any)) {
        updateData[key] = patch[key];
      }
    }

    // ולידציות
    if ("role" in updateData) {
      if (!["client", "admin", "super-admin"].includes(updateData.role)) {
        return NextResponse.json({ error: "Invalid role" }, { status: 400 });
      }
    }

    if ("subscriptionType" in updateData) {
      if (
        !Object.prototype.hasOwnProperty.call(
          smsBalances,
          updateData.subscriptionType
        )
      ) {
        return NextResponse.json(
          { error: "Invalid subscription type" },
          { status: 400 }
        );
      }
      // לא משנים אוטומטית smsBalance כאן
    }

    if (
      "phone" in updateData &&
      updateData.phone != null &&
      updateData.phone !== ""
    ) {
      const raw = String(updateData.phone);
      if (!IL_MOBILE_REGEX.test(raw)) {
        return NextResponse.json(
          { error: "מספר הטלפון חייב להיות מובייל ישראלי בפורמט 05XXXXXXXX" },
          { status: 400 }
        );
      }
    }

    if ("isActive" in updateData && typeof updateData.isActive !== "boolean") {
      return NextResponse.json(
        { error: "Invalid isActive (must be boolean)" },
        { status: 400 }
      );
    }

    if ("smsBalance" in updateData) {
      const n = Number(updateData.smsBalance);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json(
          { error: "Invalid smsBalance" },
          { status: 400 }
        );
      }
      updateData.smsBalance = Math.floor(n);
    }

    if ("smsUsed" in updateData) {
      const n = Number(updateData.smsUsed);
      if (!Number.isFinite(n) || n < 0) {
        return NextResponse.json({ error: "Invalid smsUsed" }, { status: 400 });
      }
      updateData.smsUsed = Math.floor(n);
    }

    // אופציונלי: ולידציה קלה ל-note
    if ("note" in updateData) {
      if (updateData.note != null && typeof updateData.note !== "string") {
        return NextResponse.json(
          { error: "Invalid note (must be a string)" },
          { status: 400 }
        );
      }
      // דוגמה לקיצור אוטומטי אם ארוך מדי
      if (
        typeof updateData.note === "string" &&
        updateData.note.length > 2000
      ) {
        updateData.note = updateData.note.slice(0, 2000);
      }
    }

    // עדכון בפועל
    Object.assign(user, updateData);
    await user.save();

    return NextResponse.json(user);
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "Update failed" },
      { status: 500 }
    );
  }
}
