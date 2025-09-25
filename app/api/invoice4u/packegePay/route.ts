// app/api/invoice4u/packegePay/route.ts
import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth"; // הוסף authOptions אם יש לך
import { connectToDatabase } from "@/lib/mongodb";
import Packages from "@/models/Package";
import PaymentRequest from "@/models/PaymentRequest";
import { callInvoice4U, money2, ProcessApiV2Request } from "@/lib/invoice4u";

export const dynamic = "force-dynamic";

function digitsOnly(s: string) {
  return String(s || "").replace(/\D/g, "");
}

export async function GET(req: NextRequest) {
  try {
    await connectToDatabase();

    // פרמטר packageId מה-URL
    const { searchParams } = new URL(req.url);
    const packageId = searchParams.get("packageId");
    if (!packageId) {
      return NextResponse.json(
        { error: "packageId required" },
        { status: 400 }
      );
    }

    // בדיקת התחברות
    const session = await getServerSession();
    const user = (session as any)?.user;
    if (!user?.email || !user?.id) {
      return NextResponse.redirect(new URL("/login?next=/pricing", req.url));
    }

    const payerName = user.name || user.fullName || "לקוח";
    const payerEmail = user.email;
    const payerPhone = digitsOnly(user.phone || user.mobile || user.tel || "");
    if (!payerPhone || payerPhone.length < 7) {
      return NextResponse.redirect(new URL("/account?err=phone", req.url));
    }

    // טעינת חבילה
    const pkg = await Packages.findById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }
    if (!(Number(pkg.price) > 0)) {
      return NextResponse.redirect(new URL("/pricing?err=free", req.url));
    }

    // חישוב נטו/מע״מ
    const gross = Number(pkg.price);
    const vatRate = 18;
    let net = gross,
      vatAmount = 0;
    if (vatRate > 0) {
      const base = Math.round((gross * 100) / (100 + vatRate)) / 100;
      net = base;
      vatAmount = +(gross - net).toFixed(2);
    }

    // Payload רשמי ל-ProcessApiRequestV2
    const requestPayload: ProcessApiV2Request = {
      request: {
        Invoice4UUserApiKey: process.env.I4U_API_KEY || "",
        Type: 1,
        IsAutoCreateCustomer: true,

        FullName: payerName,
        Phone: payerPhone,
        Email: payerEmail,

        Sum: gross,
        Description: String(pkg.name),
        PaymentsNum: 1,
        Currency: "ILS",
        OrderIdClientUsage: String(pkg._id),

        // מסמך
        IsDocCreate: true,
        IsManualDocCreationsWithParams: true,
        DocHeadline: "חשבונית מס קבלה",
        DocComments: `רכישת חבילה: ${pkg.name}`,
        DocItemQuantity: "1",
        DocItemPrice: money2(net),
        DocItemTaxRate: String(vatRate),
        IsItemsBase64Encoded: false,
        DocItemName: String(pkg.name),

        IsGeneralClient: false,

        // החזרות
        CallBackUrl: `${req.nextUrl.origin}/api/invoice4u/callback`,
        ReturnUrl: `${req.nextUrl.origin}/pricing/success`,

        // דגלים לא בשימוש
        AddToken: false,
        AddTokenAndCharge: false,
        ChargeWithToken: false,
        Refund: false,
        IsStandingOrderClearance: false,
        StandingOrderDuration: 0,
        IsBitPayment: false,
      },
    };

    if (!requestPayload.request.Invoice4UUserApiKey) {
      return NextResponse.json(
        { error: "Missing I4U API key" },
        { status: 500 }
      );
    }

    // קריאה לספק
    const providerRes = await callInvoice4U(
      "ProcessApiRequestV2",
      requestPayload
    );
    const d = providerRes?.d ?? providerRes;
    const hostedPageUrl = d?.ClearingRedirectUrl as string | undefined;
    if (!hostedPageUrl) {
      return NextResponse.json(
        { error: "ClearingRedirectUrl not found", providerRes },
        { status: 502 }
      );
    }

    // יצירת רשומת PaymentRequest
    await PaymentRequest.create({
      token: `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`,
      title: String(pkg.name),
      description: `רכישת חבילה: ${pkg.name}`,
      type: "payment",
      status: "active",
      amount: gross,
      vatRate,
      vatAmount,
      currency: "ILS",
      shortUrl: hostedPageUrl,
      ownerUserId: user.id,
      createdBy: user.id,
      createdAt: new Date(),
    });

    // Redirect ישיר לעמוד הסליקה
    return NextResponse.redirect(hostedPageUrl);
  } catch (err: any) {
    console.error("GET /api/invoice4u/packegePay error:", err);
    return NextResponse.redirect(
      new URL(
        `/pricing?err=${encodeURIComponent(err?.message || "pay-failed")}`,
        req.url
      )
    );
  }
}
