// app/api/payment-requests/[token]/owner-vat/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";
import BillingProfile from "@/models/BillingProfile";
import User from "@/models/User";

export async function GET(req: Request, context: any) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // חילוץ token תוך עקיפת קונפליקט הטיפוסים
    const { token } = (context?.params ?? {}) as { token: string };
    const safeToken = token?.trim();
    if (!safeToken) {
      return NextResponse.json({ error: "invalid token" }, { status: 400 });
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

    const pr = await PaymentRequest.findOne(
      { token: safeToken },
      { _id: 1, ownerUserId: 1, createdBy: 1 }
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

    const ownerUser = await User.findById(pr.ownerUserId, { email: 1 });
    const ownerEmail = ownerUser?.email;
    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Owner email not found" },
        { status: 404 }
      );
    }

    const profile = await BillingProfile.findOne(
      { ownerEmail },
      { businessType: 1, vatRate: 1 }
    );
    if (!profile) {
      return NextResponse.json(
        { error: "Billing profile not found" },
        { status: 404 }
      );
    }

    let rate = 0;
    if (profile.businessType === "EXEMPT") {
      rate = 0;
    } else {
      const r = Number(profile.vatRate ?? 0);
      rate = Number.isFinite(r) ? Math.min(100, Math.max(0, r)) : 0;
    }

    return NextResponse.json({ vatRate: rate });
  } catch (err: any) {
    console.error("GET /api/payment-requests/[token]/owner-vat error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
