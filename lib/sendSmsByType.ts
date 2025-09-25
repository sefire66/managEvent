import {
  generateSmsMessageByType,
  type SmsType,
} from "@/lib/generateSmsMessageByType";
import type { Guest, EventDetails } from "@/app/types/types";

// אופציות לשליחת ביטול (MVP)
export type CancelSendOpts = {
  cancelCustomText?: string;
  cancelIncludeTime?: boolean; // נשתמש ב-false בשלב זה
  cancelIncludeLocation?: boolean; // ברירת מחדל true אם לא סופק
  cancelShortLink?: string;
};

// בסיס כתובת – ריק בדפדפן (נתיב יחסי), מלא בצד השרת/SSR
const BASE =
  typeof window === "undefined"
    ? process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000"
    : "";
const SENDING_ENDPOINT = "/api/sms";

type ProviderResult = {
  ok: boolean;
  providerMessageId?: string;
  error?: string;
  code?: "NO_BALANCE";
  smsBalance?: number;
  smsUsed?: number;
};

/** שליחה אמיתית דרך /api/sms – ה-API שמוריד יתרה */
async function sendViaProvider(
  phone: string,
  text: string
): Promise<ProviderResult> {
  try {
    const res = await fetch(`${BASE}${SENDING_ENDPOINT}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      // /api/sms מצפה לשדות: { to, message }
      body: JSON.stringify({ to: phone, message: text }),
      credentials: "include", // לוודא שה־cookie של הסשן מצורף
    });

    const data = await res.json().catch(() => null);

    if (!res.ok) {
      const msg = data?.error || `HTTP ${res.status}`;
      // 400 "No SMS balance left" -> קוד ייעודי לעצירה
      const noBalance =
        res.status === 400 &&
        /No SMS balance left|אין מספיק יתרת SMS/i.test(String(msg));
      return {
        ok: false,
        error: msg,
        code: noBalance ? "NO_BALANCE" : undefined,
      };
    }

    // ה-API שלך מחזיר { success, smsBalance, smsUsed }
    return {
      ok: true,
      providerMessageId: data?.id || "ok",
      smsBalance: data?.smsBalance,
      smsUsed: data?.smsUsed,
    };
  } catch (e: any) {
    return { ok: false, error: e?.message || "send failed" };
  }
}

/** שולחת הודעה לפי סוג לכל נמעני הרשימה, ורושמת לוגים ב-/api/sms-log */
export async function sendSmsByType(
  recipients: Guest[],
  event: EventDetails,
  type: SmsType,
  ownerEmail: string,
  cancelOpts?: CancelSendOpts
): Promise<boolean> {
  let allOk = true;
  let outOfBalance = false;

  const logs: Array<{
    ownerEmail: string;
    eventId: string;
    guestName: string;
    guestPhone: string;
    smsType: SmsType;
    status: "sent" | "failed";
    sentAt: string;
  }> = [];

  for (const g of recipients) {
    if (outOfBalance) break; // עצור אם נגמר הקרדיט בשליחה קודמת

    const rsvpLink =
      type === "invitation" || type === "reminder"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${encodeURIComponent(String(g._id))}`
        : undefined;

    const phone = (g.phone ?? "").trim();
    if (!phone) {
      logs.push({
        ownerEmail,
        eventId: String(event._id),
        guestName: g.name || "",
        guestPhone: "",
        smsType: type,
        status: "failed",
        sentAt: new Date().toISOString(),
      });
      allOk = false;
      continue;
    }

    const text = generateSmsMessageByType(
      type,
      g,
      event,
      rsvpLink,
      type === "cancel"
        ? {
            cancelCustomText: cancelOpts?.cancelCustomText,
            cancelIncludeTime: !!cancelOpts?.cancelIncludeTime, // כרגע יהיה false
            cancelIncludeLocation: cancelOpts?.cancelIncludeLocation ?? true,
            cancelShortLink: cancelOpts?.cancelShortLink,
          }
        : undefined
    );

    const { ok, error, code } = await sendViaProvider(phone, text);

    logs.push({
      ownerEmail,
      eventId: String(event._id),
      guestName: g.name || "",
      guestPhone: phone,
      smsType: type,
      status: ok ? "sent" : "failed",
      sentAt: new Date().toISOString(),
    });

    if (!ok) {
      console.error("❌ sendViaProvider failed:", { phone, error });
      allOk = false;
      if (code === "NO_BALANCE") {
        outOfBalance = true; // מפסיקים לנסות לשלוח לשאר
      }
    }
  }

  // רישום לוגים – רק אם יש ownerEmail
  try {
    if (ownerEmail && logs.length) {
      await fetch(`${BASE}/api/sms-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(logs),
      });
    }
  } catch (e) {
    console.error("❌ POST /api/sms-log failed:", e);
  }

  return allOk;
}
