import { NextResponse } from "next/server";

// פונקציה שמוודאת שהמספר בפורמט בינלאומי (למשל: 052-... → 97252...)
function formatPhoneNumber(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  return digits.startsWith("972") ? digits : digits.replace(/^0/, "972");
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { to, message } = body;

    if (!to || !message) {
      return NextResponse.json(
        { error: "Missing 'to' or 'message'" },
        { status: 400 }
      );
    }

    const formattedPhone = formatPhoneNumber(to);
    const sender = "ManageEvent"; // ← ודא שהשולח הזה מאושר ב-InforU
    const authHeader = process.env.INFORU_AUTH;

    if (!authHeader) {
      return NextResponse.json(
        { error: "Missing INFORU_AUTH environment variable" },
        { status: 500 }
      );
    }

    // הדפסת פרטי השליחה לצורכי בדיקה
    console.log("Sending to InforU:", {
      Phone: formattedPhone,
      Message: message,
      Sender: sender,
      AuthHeader: authHeader.slice(0, 20) + "...", // רק להצגה חלקית
    });

    const apiRes = await fetch("https://capi.inforu.co.il/api/v2/SMS/SendSms", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: authHeader, // ← שלח את ההרשאה כפי שהעתקת מ-InforU
      },
      body: JSON.stringify({
        Data: {
          Message: message,
          Recipients: [{ Phone: formattedPhone }],
          Settings: { Sender: sender },
        },
      }),
    });

    const text = await apiRes.text();
    console.log("InforU Raw Response:", text);

    let data;
    try {
      data = JSON.parse(text);
    } catch (parseError) {
      return NextResponse.json(
        { error: "Failed to parse InforU response", raw: text },
        { status: 502 }
      );
    }

    if (data.StatusId === 1) {
      return NextResponse.json({ success: true, details: data });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data.StatusDescription || "Unknown error",
          raw: data,
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("inforUsms error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
