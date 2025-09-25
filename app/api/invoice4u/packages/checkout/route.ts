// app/api/invoice4u/packages/checkout/route.ts
import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import Package from "@/models/Package";
import User from "@/models/User";
import { callInvoice4U } from "@/lib/invoice4u";

/** נוח ל-dev/staging/production: בניית base URL מהכותרות */
function baseUrlFromHeaders(req: Request) {
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host");
  const proto =
    req.headers.get("x-forwarded-proto") ??
    (host?.includes("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    // 1) אימות משתמש (כמו ב-/api/payments/save)
    const session = await getServerSession(authOptions);
    if (!session || !session.user?.email) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const userEmail = session.user.email as string;

    // 2) גוף הבקשה
    const body = await req.json().catch(() => ({}) as any);
    const packageId: string | undefined = body?.packageId;
    if (!packageId) {
      return NextResponse.json(
        { error: "packageId is required" },
        { status: 400 }
      );
    }

    // 3) DB
    await connectToDatabase();

    const pkg = await Package.findById(packageId);
    if (!pkg) {
      return NextResponse.json({ error: "Package not found" }, { status: 404 });
    }

    // משתמש + שדות לזיהוי אצל I4U
    const user = await User.findOne({ email: userEmail });
    if (!user) {
      return NextResponse.json({ error: "User not found" }, { status: 404 });
    }

    const fullName =
      (session.user.name as string) ||
      user.name ||
      userEmail.split("@")[0] ||
      "Customer";
    const phone = user.phone;
    if (!phone || String(phone).replace(/\D/g, "").length < 7) {
      return NextResponse.json(
        { error: "User phone is missing or invalid" },
        { status: 400 }
      );
    }

    // 4) בניית בקשה ל-I4U (ProcessApiRequestV2)
    const base = baseUrlFromHeaders(req);
    const sum = Number(pkg.price) || 0;
    const description = String(pkg.name || "Package");

    // מזהה הלקוח/הזמנה — נוח לשחזור בקולבק
    const orderIdClientUsage = `${user._id}:${pkg._id}:${Date.now()}`;

    // שדות סביבת עבודה (לא מנחשים — מסתמכים על ה-ENV שלך; ל-Meshulam ערך מקובל 7)
    const apiKey = process.env.I4U_API_KEY || "";
    const ccType = Number(process.env.I4U_CC_TYPE || 7); // 7=Meshulam (כפי שציינת)
    const callbackUrl =
      process.env.I4U_CALLBACK_URL || `${base}/api/invoice4u/callback`;
    const returnUrl = process.env.I4U_RETURN_URL || `${base}/pay/success`;

    if (!apiKey) {
      return NextResponse.json(
        { error: "I4U_API_KEY is missing" },
        { status: 500 }
      );
    }

    // בניית ה-payload לפי מה שכבר עובד אצלך בקוד הקיים
    const requestPayload = {
      request: {
        Invoice4UUserApiKey: apiKey,

        // מספרים/בולים אמיתיים לפי הדוקו
        Type: 1, // Regular
        CreditCardCompanyType: ccType,
        IsAutoCreateCustomer: true, // יצירת לקוח אוטומטית (לא כללי)

        FullName: fullName,
        Phone: String(phone),
        Email: userEmail,

        Sum: sum,
        Description: description,
        PaymentsNum: 1,
        Currency: "ILS",
        OrderIdClientUsage: orderIdClientUsage,

        // מסמך פשוט (חשבונית מס קבלה) עם פריט יחיד – אופציונלי, אבל זה מה שעובד אצלך
        IsDocCreate: true,
        DocHeadline: "חשבונית מס קבלה",
        IsManualDocCreationsWithParams: false,
        DocItemQuantity: "1",
        DocItemPrice: sum.toFixed(2), // ברוטו – ניקח כשורה אחת
        // אם תרצה מע״מ מפורק, אפשר להוסיף DocItemTaxRate, אבל כרגע אנחנו שולחים ברוטו
        IsItemsBase64Encoded: false,
        DocItemName: `רכישת חבילה: ${description}`,

        // אם בכל זאת תרצה כללי:
        // IsGeneralClient: false,

        // URLs
        CallBackUrl: callbackUrl,
        ReturnUrl: returnUrl,

        // דגלים שלא בשימוש
        AddToken: false,
        AddTokenAndCharge: false,
        ChargeWithToken: false,
        Refund: false,
        IsStandingOrderClearance: false,
        StandingOrderDuration: 0,

        IsBitPayment: false,
      },
    };

    // לוג בטוח (מסתיר מפתח)
    const safePayload = {
      ...requestPayload,
      request: { ...requestPayload.request, Invoice4UUserApiKey: "***" },
    };
    console.log(
      "[I4U/packages] request payload:",
      JSON.stringify(safePayload, null, 2)
    );

    // 5) קריאה ל-I4U
    const providerRes = await callInvoice4U<any>(
      "ProcessApiRequestV2",
      requestPayload
    );

    console.log(
      "[I4U/packages] response:",
      JSON.stringify(providerRes, null, 2)
    );

    const d = providerRes?.d ?? providerRes;
    const clearingUrl: string | undefined = d?.ClearingRedirectUrl;

    if (!clearingUrl) {
      // משיבים את כל גוף התשובה לעזרה בדיבוג
      return NextResponse.json(
        { error: "failed to get ClearingRedirectUrl", providerRes },
        { status: 502 }
      );
    }

    // 6) לא שומרים כלום ב-DB כאן — רק מחזירים את הקישור לקליינט להפניה
    return NextResponse.json({
      checkoutUrl: clearingUrl,
      // אופציונלי: מזהים לעיון (לא חובה בצד לקוח)
      meta: {
        paymentId: d?.PaymentId ?? null,
        openInfo: d?.OpenInfo ?? null,
        orderIdClientUsage,
      },
    });
  } catch (err: any) {
    console.error("POST /api/invoice4u/packages/checkout error:", err);
    return NextResponse.json(
      { error: err?.message || "Internal server error" },
      { status: 500 }
    );
  }
}
