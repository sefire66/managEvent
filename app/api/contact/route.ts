import { NextResponse } from "next/server";
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export async function POST(req: Request) {
  try {
    // שלב 1: קבלת הנתונים
    const data = await req.json();
    const { name, email, message } = data;

    // שלב 2: בדיקת תקינות
    if (!name || !email || !message) {
      return NextResponse.json(
        { success: false, error: "נא למלא את כל השדות" },
        { status: 400 }
      );
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { success: false, error: "אימייל לא תקין" },
        { status: 400 }
      );
    }

    // שלב 3: שליחת המייל דרך Resend
    const response = await resend.emails.send({
      from: "טופס צור קשר <info@managevent.co.il>", // או דומיין מאומת שלך
      to: "info@managevent.co.il", // שנה לכתובת שלך
      subject: "הודעה חדשה מהאתר",
      html: `
        <p><strong>שם:</strong> ${name}</p>
        <p><strong>אימייל:</strong> ${email}</p>
        <p><strong>הודעה:</strong><br/>${message}</p>
      `,
    });

    // שלב 4: תשובה ללקוח
    return NextResponse.json({ success: true, info: response });
  } catch (error) {
    console.error("❌ שגיאה בשליחת המייל:", error);
    return NextResponse.json(
      { success: false, error: "שליחת המייל נכשלה" },
      { status: 500 }
    );
  }
}
