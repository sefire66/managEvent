// app/api/payment-requests/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import User from "@/models/User";
import mongoose from "mongoose";
import crypto from "crypto";

export async function POST(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // מאתרים את היוזר בסד"ב כדי לקבל _id (ObjectId)
    const creator = await User.findOne(
      { email: session.user.email },
      { _id: 1, role: 1 }
    );
    if (!creator?._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const body = await req.json();

    // פירוק נתונים מה-body
    const {
      eventId,
      type = "payment", // דיפולט: תשלום
      amount,
      vatAmount,
      vatRate,
      minAmount,
      currency = "ILS",
      title,
      description,
      imageUrl,
      expiresAt, // ISO או null
      usageLimit = 1, // ברירת מחדל שימוש חד-פעמי
      sentChannel, // "sms" | "email" | "manual" | null
      // אופציונלי: מאפשר לאדמין/סופר-אדמין ליצור בשם בעלים אחר
      ownerUserId: ownerFromBody,
      // עמלות (בדרך כלל רלוונטי ל-gift, אפשר להתעלם בתשלום רגיל)
      feeMode,
      feeFixed,
      feePercent,
      vatRateForFee,
      showFeeBreakdown,
    } = body || {};

    // ולידציות בסיסיות
    if (!title || typeof title !== "string") {
      return NextResponse.json({ error: "title is required" }, { status: 400 });
    }
    if (type === "payment") {
      if (!(typeof amount === "number" && amount > 0)) {
        return NextResponse.json(
          { error: "amount must be a positive number for type=payment" },
          { status: 400 }
        );
      }
    } else if (type === "gift") {
      // gift יכול להיות עם amount קבוע או סכום פתוח (minAmount)
      if (
        typeof amount !== "number" &&
        typeof minAmount === "number" &&
        minAmount <= 0
      ) {
        return NextResponse.json(
          { error: "minAmount must be > 0 for open gift" },
          { status: 400 }
        );
      }
    } else {
      return NextResponse.json({ error: "invalid type" }, { status: 400 });
    }

    // קביעת ownerUserId: ברירת מחדל – היוזר הנוכחי
    let ownerUserId: mongoose.Types.ObjectId = creator._id;

    // אם נשלח ownerUserId בבקשה, נאפשר רק למי שיש הרשאה (admin/super-admin)
    if (
      ownerFromBody &&
      (creator.role === "admin" || creator.role === "super-admin")
    ) {
      if (!mongoose.isValidObjectId(ownerFromBody)) {
        return NextResponse.json(
          { error: "ownerUserId is invalid" },
          { status: 400 }
        );
      }
      ownerUserId = new mongoose.Types.ObjectId(ownerFromBody);
    }

    // ברירות מחדל לעמלות (אם לא שלחת)
    const feeDefaults = {
      feeMode: feeMode ?? "add_on",
      feeFixed: typeof feeFixed === "number" ? feeFixed : 0,
      feePercent: typeof feePercent === "number" ? feePercent : 0,
      vatRateForFee: typeof vatRateForFee === "number" ? vatRateForFee : null,
      showFeeBreakdown:
        typeof showFeeBreakdown === "boolean" ? showFeeBreakdown : true,
    };

    // יצירת token ייחודי (24 תווים) אם לא הגיע מבחוץ
    const token =
      body?.token && typeof body.token === "string" && body.token.length >= 10
        ? body.token
        : crypto.randomUUID().replace(/-/g, "").slice(0, 24);

    // יצירה בפועל (הבלוק שלך – רק עם ownerUserId מאופס)
    const doc = await PaymentRequest.create({
      ownerUserId,
      eventId: eventId || null,

      type,
      amount: typeof amount === "number" ? amount : null,
      minAmount: typeof minAmount === "number" ? minAmount : null,
      vatAmount: typeof vatAmount === "number" ? vatAmount : null,
      vatRate: typeof vatRate === "number" ? vatRate : null,
      currency,

      title,
      description,
      imageUrl,

      token,
      shortUrl: null,
      qrUrl: null,
      expiresAt: expiresAt ? new Date(expiresAt) : null,
      usageLimit,
      uses: 0,

      // עמלות (אם gift)
      feeMode: feeDefaults.feeMode,
      feeFixed: feeDefaults.feeFixed,
      feePercent: feeDefaults.feePercent,
      vatRateForFee: feeDefaults.vatRateForFee,
      showFeeBreakdown: feeDefaults.showFeeBreakdown,

      status: "active", // דיפולט
      redirectSuccessUrl: null,
      redirectCancelUrl: null,

      lastSentAt: null,
      sentChannel: sentChannel ?? null,
      sentCount: 0,

      createdAt: new Date(),
      createdBy: creator._id,
    });

    return NextResponse.json({
      _id: doc._id,
      token: doc.token,
      shortUrl: `/pay/${doc.token}`,
      status: doc.status,
    });
  } catch (err: any) {
    console.error("POST /api/payment-requests error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
// ===== GET – רשימת בקשות תשלום =====
export async function GET(req: Request) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    await connectToDatabase();

    // מאתרים את המשתמש לקבלת _id ותפקיד
    const me = await User.findOne(
      { email: session.user.email },
      { _id: 1, role: 1 }
    ).lean();

    if (!me || Array.isArray(me) || !me._id) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const isAdmin = me.role === "admin" || me.role === "super-admin";

    // קריאת פרמטרים
    const { searchParams } = new URL(req.url);
    const ownerUserIdParam = searchParams.get("ownerUserId");
    const statusParam = searchParams.get("status"); // אפשר "active,paid"
    const typeParam = searchParams.get("type"); // אפשר "payment,gift"
    const eventIdParam = searchParams.get("eventId");
    const q = (searchParams.get("q") || "").trim();
    const dateFrom = searchParams.get("dateFrom"); // YYYY-MM-DD
    const dateTo = searchParams.get("dateTo"); // YYYY-MM-DD

    const limitRaw = parseInt(searchParams.get("limit") || "100", 10);
    const offsetRaw = parseInt(searchParams.get("offset") || "0", 10);
    const limit = Math.min(
      Math.max(isFinite(limitRaw) ? limitRaw : 100, 1),
      500
    );
    const offset = Math.max(isFinite(offsetRaw) ? offsetRaw : 0, 0);

    // בניית פילטר
    const filter: any = {};

    // הרשאות בעלות
    if (ownerUserIdParam) {
      if (!isAdmin) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
      if (!mongoose.isValidObjectId(ownerUserIdParam)) {
        return NextResponse.json(
          { error: "ownerUserId is invalid" },
          { status: 400 }
        );
      }
      filter.ownerUserId = new mongoose.Types.ObjectId(ownerUserIdParam);
    } else if (!isAdmin) {
      // משתמש רגיל – רק שלו
      filter.ownerUserId = me._id;
    }
    // אדמין בלי ownerUserId → אין פילטר בעלות (יראה הכול)

    // סטטוס/טייפ
    if (statusParam) {
      const arr = statusParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) filter.status = { $in: arr };
    }
    if (typeParam) {
      const arr = typeParam
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (arr.length) filter.type = { $in: arr };
    }

    // eventId אופציונלי
    if (eventIdParam) {
      if (!mongoose.isValidObjectId(eventIdParam)) {
        return NextResponse.json(
          { error: "eventId is invalid" },
          { status: 400 }
        );
      }
      filter.eventId = new mongoose.Types.ObjectId(eventIdParam);
    }

    // טווח תאריכים לפי createdAt
    if (dateFrom || dateTo) {
      const range: any = {};
      if (dateFrom) {
        const d1 = new Date(dateFrom);
        if (!isNaN(d1.getTime())) range.$gte = d1;
      }
      if (dateTo) {
        const d2 = new Date(dateTo);
        if (!isNaN(d2.getTime())) {
          d2.setHours(23, 59, 59, 999);
          range.$lte = d2;
        }
      }
      if (Object.keys(range).length) filter.createdAt = range;
    }

    // חיפוש חופשי ב-title/token
    if (q) {
      const rx = new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
      filter.$or = [{ title: rx }, { token: rx }];
    }

    // שליפה
    const items = await PaymentRequest.find(filter, {
      // פרוג'קשן: רק מה שצריך לטבלה
      title: 1,
      type: 1,
      status: 1,
      token: 1,
      shortUrl: 1,
      amount: 1,
      currency: 1,
      // שדות VAT יוחזרו אם קיימים בסכימה שלך
      vatRate: 1,
      vatAmount: 1,
      uses: 1,
      usageLimit: 1,
      expiresAt: 1,
      createdAt: 1,
      createdBy: 1,
    })
      .sort({ createdAt: -1 })
      .skip(offset)
      .limit(limit)
      .populate({ path: "createdBy", select: "name email" })
      .lean();

    return NextResponse.json(items);
  } catch (error) {
    console.error("GET /api/payment-requests error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
