import { NextResponse } from "next/server";

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

    const apiRes = await fetch(
      "https://capi.inforu.co.il/api/v2/Message/SendSms",
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          User: {
            Username: process.env.INFORU_USERNAME,
            ApiToken: process.env.INFORU_API_TOKEN,
          },
          Message: {
            Sender: "MyCompany", // replace with your actual approved sender ID
            Recipients: [{ PhoneNumber: to }],
            Text: message,
          },
        }),
      }
    );

    const data = await apiRes.json();

    if (data.Status?.StatusId === 1) {
      return NextResponse.json({ success: true, details: data });
    } else {
      return NextResponse.json(
        {
          success: false,
          error: data.Status?.StatusDescription || "Unknown error",
        },
        { status: 500 }
      );
    }
  } catch (err) {
    console.error("inforUsms error:", err);
    return NextResponse.json({ error: "Server error" }, { status: 500 });
  }
}
