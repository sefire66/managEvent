import type { Guest } from "../app/types/types";
import type { EventDetails } from "../app/types/types";

import {
  generateSmsMessageByType,
  SmsType,
} from "@/lib/generateSmsMessageByType";

// ✅ נשתמש ב־URL מלא לצד שרת
const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3000";

export async function sendSmsByType(
  guests: Guest[],
  event: EventDetails,
  type: SmsType,
  userEmail: string
): Promise<boolean> {
  let allSuccess = true;

  // ✅ שלוף את המשתמש לפי האימייל שהועבר
  const userRes = await fetch(
    `${baseUrl}/api/user/by-email?email=${userEmail}`
  );
  const userData = await userRes.json();

  if (!userRes.ok || !userData.user) {
    console.error("שגיאה בשליפת המשתמש לפי אימייל");
    return false;
  }

  if (userData.user.smsBalance <= 0) {
    console.error("אין מספיק קרדיט SMS לשליחה");
    return false;
  }

  for (const guest of guests) {
    const rsvpLink =
      type === "invitation" || type === "reminder"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${guest._id}`
        : "";

    const message = generateSmsMessageByType(type, guest, event, rsvpLink);

    try {
      const res = await fetch(`${baseUrl}/api/inforUsms`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ to: guest.phone, message }),
      });

      const result = await res.json();
      const status = res.ok && result.success ? "sent" : "failed";

      if (status === "sent") {
        // ✅ עדכן את ה־guest שהוא קיבל הודעה
        await fetch(`${baseUrl}/api/guest/${guest._id}/sms`, {
          method: "PATCH",
        });

        // ✅ עדכן את ה־smsUsed של המשתמש
        await fetch(`${baseUrl}/api/user/sms`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: userEmail }),
        });
      } else {
        console.error("SMS send error:", result);
        allSuccess = false;
      }

      console.log("=======LOG PAYLOAD ->=====", {
        guestName: guest.name,
        guestPhone: guest.phone,
        eventId: String(event._id),
        smsType: type,
        status,
        ownerEmail: userEmail,
      });

      // ✅ שמור לוג השליחה דרך API (שם+טלפון, בלי guestId)
      await fetch(`${baseUrl}/api/sms-log`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          guestName: guest.name || "",
          guestPhone: guest.phone || "",
          eventId: String(event._id),
          smsType: type,
          status, // "sent" או "failed"
          sentAt: new Date().toISOString(), // אפשר גם להשמיט, יש default בסכימה
          ownerEmail: userEmail,
        }),
      });
    } catch (err) {
      console.error("❌ שגיאה בשליחה:", err);
      allSuccess = false;
    }
  }

  return allSuccess;
}
