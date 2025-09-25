// app/api/payment-requests/[token]/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import User from "@/models/User";

/** 🔧 דגלים (בדיקות) – כרגע מאופשרים כפי שביקשת */
const ALLOW_PATCH = true; // לחלופין: process.env.ALLOW_PR_PATCH === "true" || process.env.ALLOW_PR_PATCH === "1"
const ALLOW_DELETE = true; // לחלופין: process.env.ALLOW_PR_DELETE === "true" || process.env.ALLOW_PR_DELETE === "1"

/** עיגול לאגורות */
function roundAgorot(n: number) {
  return Math.round(n * 100) / 100;
}

/* ============================================================================
 * GET – שליפת בקשה לפי token (כפי שקיים אצלך, נשמר ללא שינוי מבני)
 * ==========================================================================*/
export async function GET(
  _req: Request,

  ctx: { params: Promise<{ token: string }> }
) {
  try {
    await connectToDatabase();

    const { token } = await ctx.params;

    const pr = await PaymentRequest.findOne({ token }).lean();
    if (!pr) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    // מחזירים רק מה שנחוץ ל־UI (כפי שביקשת)
    return NextResponse.json({
      _id: String(pr._id),
      token: pr.token,
      type: pr.type, // "payment" | "gift"
      title: pr.title,
      description: pr.description,
      imageUrl: pr.imageUrl,
      currency: pr.currency,

      amount: pr.amount, // אם payment או gift-קבוע
      minAmount: pr.minAmount, // אם gift פתוח

      feeMode: pr.feeMode, // אם gift
      feeFixed: pr.feeFixed,
      feePercent: pr.feePercent,
      // vatRateForFee: pr.vatRateForFee, // הושבת אצלך – נשאר כך
      showFeeBreakdown: pr.showFeeBreakdown,

      status: pr.status,
      usageLimit: pr.usageLimit,
      uses: pr.uses,
      expiresAt: pr.expiresAt ? new Date(pr.expiresAt).toISOString() : null,

      ownerUserId: pr.ownerUserId ? String(pr.ownerUserId) : null,
      eventId: pr.eventId ? String(pr.eventId) : null,
      shortUrl: pr.shortUrl ?? null,
    });
  } catch (err: any) {
    console.error("GET /api/payment-requests/[token] error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================================
 * PATCH – עדכון בקשה לפי token (בדיקות מאופשרות ע״י הדגל)
 *  - כולל סנכרון amount (ברוטו) ↔ net (לפני מע״מ) ↔ vatAmount
 *  - תמיכה ב-vatRate וגם vatRateForFee לתאימות
 * ==========================================================================*/
export async function PATCH(
  req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!ALLOW_PATCH) {
    return NextResponse.json({ error: "PATCH disabled" }, { status: 405 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // מי המשתמש (להרשאות)
    const me = await User.findOne(
      { email: session.user.email },
      { _id: 1, role: 1 }
    );
    if (!me?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isAdmin = me.role === "admin" || me.role === "super-admin";

    const { token } = await ctx.params; // ← חדש: await

    // שליפת הבקשה (לא lean – צריך שמירה)
    const pr = await PaymentRequest.findOne({ token }); // לא lean!
    if (!pr) {
      return NextResponse.json(
        { error: "PaymentRequest not found" },
        { status: 404 }
      );
    }

    // הרשאות: בעלים / יוצר / אדמין
    const isOwner = pr.ownerUserId?.toString() === me._id.toString();
    const isCreator = pr.createdBy?.toString() === me._id.toString();
    if (!isAdmin && !isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const body = await req.json();

    /* ----- שדות תוכן/מטא ----- */
    if (typeof body.title === "string") pr.title = body.title;
    if (typeof body.description === "string" || body.description === null)
      pr.description = body.description ?? null;
    if (typeof body.imageUrl === "string" || body.imageUrl === null)
      pr.imageUrl = body.imageUrl ?? null;

    if (body.type === "payment" || body.type === "gift") pr.type = body.type;

    if (
      typeof body.status === "string" &&
      ["draft", "active", "paid", "expired", "canceled"].includes(body.status)
    ) {
      pr.status = body.status;
    }

    if (typeof body.currency === "string") pr.currency = body.currency;

    if (
      typeof body.usageLimit === "number" &&
      Number.isFinite(body.usageLimit) &&
      body.usageLimit >= 1
    ) {
      pr.usageLimit = Math.floor(body.usageLimit);
    }

    if (typeof body.expiresAt === "string" || body.expiresAt === null) {
      pr.expiresAt = body.expiresAt ? new Date(body.expiresAt) : null;
    }

    /* ----- עמלות (אם בשימוש) ----- */
    if (body.feeMode === "included" || body.feeMode === "add_on")
      pr.feeMode = body.feeMode;
    if (typeof body.feeFixed === "number") pr.feeFixed = body.feeFixed;
    if (typeof body.feePercent === "number") pr.feePercent = body.feePercent;
    if (typeof body.showFeeBreakdown === "boolean")
      pr.showFeeBreakdown = body.showFeeBreakdown;

    /* ----- VAT: תמיכה גם בשם הישן vatRateForFee וגם החדש vatRate ----- */
    let nextVatRate: number | undefined = undefined;
    if (typeof body.vatRate === "number") nextVatRate = body.vatRate;
    else if (typeof body.vatRateForFee === "number")
      nextVatRate = body.vatRateForFee;

    if (typeof nextVatRate === "number") {
      const r = Math.max(0, Math.min(100, nextVatRate));
      (pr as any).vatRate = r; // אם השדה קיים בסכמה החדשה
      (pr as any).vatRateForFee = r; // תאימות אחורה (אם נשאר בשדה הישן)
    } else {
      // ודא שתזרים מספר לחישוב גם אם לא נשלח
      (pr as any).vatRate =
        Number((pr as any).vatRate ?? (pr as any).vatRateForFee ?? 0) || 0;
    }

    /* ----- סכומים: amount (ברוטו) ↔ net ↔ vatAmount ----- */
    const vatRateNum: number =
      Number((pr as any).vatRate ?? (pr as any).vatRateForFee ?? 0) || 0;

    const hasAmount =
      typeof body.amount === "number" && Number.isFinite(body.amount);
    const hasNet = typeof body.net === "number" && Number.isFinite(body.net);
    const hasVatAmount =
      typeof body.vatAmount === "number" && Number.isFinite(body.vatAmount);

    if (hasNet) {
      const netVal = Math.max(0, body.net);
      const gross =
        vatRateNum > 0 ? roundAgorot(netVal * (1 + vatRateNum / 100)) : netVal;
      pr.amount = gross;
      (pr as any).vatAmount = roundAgorot(gross - netVal);
    } else if (hasAmount) {
      const amt = Math.max(0, body.amount);
      pr.amount = amt;
      const computedVat =
        vatRateNum > 0
          ? roundAgorot((amt * vatRateNum) / (100 + vatRateNum))
          : 0;
      (pr as any).vatAmount = hasVatAmount
        ? Math.max(0, roundAgorot(body.vatAmount))
        : computedVat;
    } else if (hasVatAmount && pr.amount != null) {
      (pr as any).vatAmount = Math.max(0, roundAgorot(body.vatAmount));
    } else if (pr.amount != null) {
      (pr as any).vatAmount =
        vatRateNum > 0
          ? roundAgorot((pr.amount * vatRateNum) / (100 + vatRateNum))
          : 0;
    }

    /* ----- ולידציות בסיס ----- */
    if (pr.type === "payment") {
      if (!(typeof pr.amount === "number" && pr.amount > 0)) {
        return NextResponse.json(
          { error: "amount must be a positive number for type=payment" },
          { status: 400 }
        );
      }
      // מינימום 1 ₪ (כמו בהערת הסכמה)
      if (pr.amount < 1) {
        return NextResponse.json(
          { error: "amount must be at least 1 ILS" },
          { status: 400 }
        );
      }
    }
    if (typeof pr.usageLimit === "number" && typeof pr.uses === "number") {
      if (pr.usageLimit < pr.uses) {
        return NextResponse.json(
          { error: "usageLimit cannot be less than current uses" },
          { status: 400 }
        );
      }
    }

    await pr.save();

    return NextResponse.json({ ok: true, token: pr.token, status: pr.status });
  } catch (err: any) {
    console.error("PATCH /api/payment-requests/[token] error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}

/* ============================================================================
 * DELETE – מחיקה לפי token (בדיקות מאופשרות ע״י הדגל)
 * ==========================================================================*/
export async function DELETE(
  _req: Request,
  ctx: { params: Promise<{ token: string }> }
) {
  if (!ALLOW_DELETE) {
    return NextResponse.json({ error: "DELETE disabled" }, { status: 405 });
  }

  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    const me = await User.findOne(
      { email: session.user.email },
      { _id: 1, role: 1 }
    );
    if (!me?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }
    const isAdmin = me.role === "admin" || me.role === "super-admin";

    const { token } = await ctx.params; // ← חדש: await
    const pr = await PaymentRequest.findOne(
      { token },
      { _id: 1, ownerUserId: 1, createdBy: 1, status: 1, uses: 1, token: 1 }
    );

    if (!pr) {
      return NextResponse.json(
        { error: "PaymentRequest not found" },
        { status: 404 }
      );
    }

    const isOwner = pr.ownerUserId?.toString() === me._id.toString();
    const isCreator = pr.createdBy?.toString() === me._id.toString();
    if (!isAdmin && !isOwner && !isCreator) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    // שלב בדיקות: מחיקה ישירה
    await PaymentRequest.deleteOne({ _id: pr._id });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error("DELETE /api/payment-requests/[token] error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
