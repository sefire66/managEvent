// api/billing-profile/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import BillingProfile from "@/models/BillingProfile";

// ===== GET – שליפת פרופיל/ים עסקיים =====
export async function GET(req: Request) {
  try {
    await connectToDatabase();

    const { searchParams } = new URL(req.url);
    const email = searchParams.get("email"); // אופציונלי: סינון לפי בעלים
    const list = searchParams.get("list") === "1"; // אופציונלי: החזרת מערך פרופילים
    const name = searchParams.get("name"); // אופציונלי: חיפוש לפי businessName

    const query: Record<string, any> = {};
    if (email) query.ownerEmail = email;

    if (name) {
      // חיפוש case-insensitive חלקי בשם העסק
      const esc = name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
      query.businessName = { $regex: esc, $options: "i" };
    }

    // מצב רשימה (או חיפוש בשם): נחזיר תמיד מערך (גם אם ריק)
    if (list || name) {
      const profiles = await BillingProfile.find(query)
        .sort({ isDefault: -1, lastUsedAt: -1, createdAt: -1 })
        .lean();
      return NextResponse.json(profiles);
    }

    // תאימות לאחור: ללא list וללא name – נחזיר פרופיל יחיד או 404
    const profile = await BillingProfile.findOne(query).lean();
    if (!profile) {
      return NextResponse.json(
        { error: "לא נמצא פרופיל עסקי" },
        { status: 404 }
      );
    }
    return NextResponse.json(profile);
  } catch (error) {
    console.error("GET /api/billing-profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בשליפת פרופיל עסקי" },
      { status: 500 }
    );
  }
}

// ===== PATCH – עדכון פרופיל עסקי (ללא שינוי חתימה) =====
export async function PATCH(req: Request) {
  try {
    await connectToDatabase();
    const body = await req.json();

    const { ownerEmail, _id, ...updates } = body; // לא נשתמש ב-_id
    if (!ownerEmail) {
      return NextResponse.json({ error: "חסר ownerEmail" }, { status: 400 });
    }

    const profile = await BillingProfile.findOneAndUpdate(
      { ownerEmail },
      { $set: updates },
      { new: true, upsert: true }
    ).lean();

    return NextResponse.json(profile);
  } catch (error) {
    console.error("PATCH /api/billing-profile error:", error);
    return NextResponse.json(
      { error: "שגיאה בעדכון פרופיל עסקי" },
      { status: 500 }
    );
  }
}
