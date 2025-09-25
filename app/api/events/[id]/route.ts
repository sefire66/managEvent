// app/api/events/[id]/route.ts

import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Event from "@/models/Event";
import Guest from "@/models/Guest";
import Table from "@/models/Table";
import mongoose from "mongoose";

export const dynamic = "force-dynamic"; // מונע קאשינג ב-App Router

// ---------- Types (Lean) ----------
type EventPreferencesLean = {
  hideDetails: boolean;
  imageRatio: "auto" | "16:9" | "4:3";
  version?: number;
  updatedAt?: string; // ISO
};

type EventLean = {
  _id: string;
  brideFirst?: string;
  brideLast?: string;
  groomFirst?: string;
  groomLast?: string;
  date?: string; // "YYYY-MM-DD"
  time?: string;
  venue?: string;
  address?: string;
  eventType?: string;
  ownerEmail?: string;
  imageUrl?: string;
  imagePath?: string;
  googleMapsLink?: string;
  wazeLink?: string;
  isCanceled?: boolean;
  cancelReason?: string;

  // חדש: ההעדפות המקוננות
  preferences?: EventPreferencesLean;
};

// ---------- GET: קבלת אירוע כולל preferences ----------
export async function GET(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "מזהה אירוע לא תקין" }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const ev = await Event.findById(eventId)
      .select(
        "_id brideFirst brideLast groomFirst groomLast date time venue address eventType ownerEmail imageUrl imagePath googleMapsLink wazeLink isCanceled cancelReason preferences"
      )
      .lean<any | null>();

    if (!ev) {
      return NextResponse.json({ error: "האירוע לא נמצא" }, { status: 404 });
    }

    // ברירות מחדל ל-preferences אם חסר במסמך ישן
    const prefs: EventPreferencesLean = {
      hideDetails: ev?.preferences?.hideDetails ?? false,
      imageRatio: (ev?.preferences?.imageRatio as any) ?? "auto",
      version: ev?.preferences?.version ?? 1,
      updatedAt: ev?.preferences?.updatedAt
        ? new Date(ev.preferences.updatedAt).toISOString()
        : new Date().toISOString(),
    };

    const data: EventLean = {
      _id: String(ev._id),
      brideFirst: ev.brideFirst ?? "",
      brideLast: ev.brideLast ?? "",
      groomFirst: ev.groomFirst ?? "",
      groomLast: ev.groomLast ?? "",
      date: ev.date ?? "",
      time: ev.time ?? "",
      venue: ev.venue ?? "",
      address: ev.address ?? "",
      eventType: ev.eventType ?? "",
      ownerEmail: ev.ownerEmail ?? "",
      imageUrl: ev.imageUrl ?? "",
      imagePath: ev.imagePath ?? "",
      googleMapsLink: ev.googleMapsLink ?? "",
      wazeLink: ev.wazeLink ?? "",
      isCanceled: ev.isCanceled ?? false,
      cancelReason: ev.cancelReason ?? "",

      preferences: prefs,
    };

    return NextResponse.json(data, {
      status: 200,
      headers: { "Cache-Control": "no-store" },
    });
  } catch (error: any) {
    console.error("GET event error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- PATCH: עדכון נקודתי של preferences ----------
export async function PATCH(
  req: Request,
  { params }: { params: { id: string } }
) {
  const eventId = params.id;

  if (!mongoose.Types.ObjectId.isValid(eventId)) {
    return NextResponse.json({ error: "מזהה אירוע לא תקין" }, { status: 400 });
  }

  await connectToDatabase();

  try {
    const body = await req.json();

    // ולידציה לבנה ופשוטה לשדות המותרים
    const next: Partial<EventPreferencesLean> = {};
    const allowedRatios = new Set(["auto", "16:9", "4:3"]);

    if (typeof body.hideDetails === "boolean") {
      next.hideDetails = body.hideDetails;
    }
    if (
      typeof body.imageRatio === "string" &&
      allowedRatios.has(body.imageRatio)
    ) {
      next.imageRatio = body.imageRatio as "auto" | "16:9" | "4:3";
    }

    // אם לא הגיע שום שדה חוקי
    if (!("hideDetails" in next) && !("imageRatio" in next)) {
      return NextResponse.json(
        { error: "No valid preferences provided" },
        { status: 400 }
      );
    }

    // בניית $set נקודתי
    const setOps: Record<string, any> = {};
    if ("hideDetails" in next)
      setOps["preferences.hideDetails"] = next.hideDetails;
    if ("imageRatio" in next)
      setOps["preferences.imageRatio"] = next.imageRatio;
    setOps["preferences.updatedAt"] = new Date();
    setOps["preferences.version"] = 1; // אפשר לשדרג לוגיקה של גרסאות בהמשך

    // עדכון והחזרה
    const updated = await Event.findByIdAndUpdate(
      eventId,
      { $set: setOps },
      { new: true }
    ).lean<any | null>();

    if (!updated) {
      return NextResponse.json({ error: "האירוע לא נמצא" }, { status: 404 });
    }

    const prefs: EventPreferencesLean = {
      hideDetails: updated.preferences?.hideDetails ?? false,
      imageRatio: (updated.preferences?.imageRatio as any) ?? "auto",
      version: updated.preferences?.version ?? 1,
      updatedAt: updated.preferences?.updatedAt
        ? new Date(updated.preferences.updatedAt).toISOString()
        : new Date().toISOString(),
    };

    return NextResponse.json(
      { _id: String(updated._id), preferences: prefs },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("PATCH event preferences error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

// ---------- DELETE: מחיקת אירוע והמידע הקשור (כמו אצלך) ----------
export async function DELETE(
  _req: Request,
  context: { params: { id: string } }
) {
  await connectToDatabase();
  const { id: eventId } = context.params;

  try {
    const tablesResult = await Table.deleteMany({ eventId });
    console.log(`Deleted ${tablesResult.deletedCount} tables.`);

    const guestsResult = await Guest.deleteMany({ eventId });
    console.log(`Deleted ${guestsResult.deletedCount} guests.`);

    const eventResult = await Event.findByIdAndDelete(eventId);
    console.log(`Deleted event: ${eventResult?._id || "Not found"}`);

    if (!eventResult) {
      return NextResponse.json({ error: "Event not found" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      deleted: {
        tables: tablesResult.deletedCount,
        guests: guestsResult.deletedCount,
        event: eventResult._id,
      },
    });
  } catch (error: any) {
    console.error("Error deleting event and related data:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
