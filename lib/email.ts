import { resend } from "@/lib/resend"; // לפי איך שהגדרת את החיבור ל-Resend

export async function sendVerificationEmail(email: string, token: string) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL;

  const verifyUrl = `${baseUrl}/verify-email?token=${token}`;

  console.log("🔗 Sending verification link to:", email);
  console.log("✅ Link:", verifyUrl);

  await resend.emails.send({
    from: "אימות <info@managevent.co.il>",

    // from: "אימות <eventnceleb@gmail.com>",
    // from: "אימות <onboarding@resend.dev>",
    to: email,
    subject: "אימות כתובת אימייל",
    html: `
      <p>שלום,</p>
      <p>נא לאמת את כתובת האימייל שלך ע"י לחיצה על הקישור:</p>
      <p><a href="${verifyUrl}">אמת את האימייל שלך</a></p>
      <p>תודה,</p>
      <p>צוות האתר</p>
    `,
  });
}

export async function sendResetEmail(email: string, resetUrl: string) {
  console.log("🔗 Sending reset link to:", email);
  console.log("✅ Link:", resetUrl);

  await resend.emails.send({
    from: "איפוס סיסמה <info@managevent.co.il>",
    to: email,
    subject: "איפוס סיסמה לחשבון שלך",
    html: `
  <div dir="rtl" style="direction:rtl;text-align:right;font-family:Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;font-size:16px;color:#111;line-height:1.6;">
    <p style="margin:0 0 12px;">שלום,</p>
    <p style="margin:0 0 12px;">קיבלנו בקשה לאיפוס סיסמה לחשבון שלך.</p>
    <p style="margin:0 0 12px;">כדי לאפס את הסיסמה לחץ על הקישור הבא:</p>
    <p style="margin:0 0 16px;">
      <a href="${resetUrl}" style="display:inline-block;padding:10px 16px;text-decoration:none;border-radius:8px;border:1px solid #0a66c2;">
        אפס את הסיסמה
      </a>
    </p>
    <p style="margin:0 0 12px;">אם לא ביקשת איפוס, ניתן להתעלם מהמייל.</p>
    <p style="margin:0 0 12px;">תודה,</p>
    <p style="margin:0;">צוות האתר</p>
  </div>
`,
  });
}

// lib/email.ts

/**
 * מייל בקשת תשלום – תבנית עשירה עם לוגו וכפתור
 * שולח גם HTML וגם text fallback
 */
export async function sendPaymentRequestEmail(args: {
  to: string;
  link: string; // קישור לתשלום (יחסי או מלא)
  title: string; // כותרת הבקשה
  amount?: number | null; // סכום (לא חובה במתנה פתוחה)
  currency?: string; // ILS ברירת מחדל
  imageUrl?: string | null; // תמונת אירוע/מוצר (אופציונלי)
  description?: string | null; // טקסט תיאור (אופציונלי)
  recipientName?: string | null; // שם הנמען לפתיח (אופציונלי)
  // מיתוג אופציונלי (אם לא תשלח – ניקח מה-ENV)
  brandName?: string;
  brandLogoUrl?: string;
  brandPrimary?: string; // צבע כפתור/קישוטים (hex) למשל #3b82f6
  supportEmail?: string; // מייל תמיכה לשורת תחתית
}) {
  const {
    to,
    link,
    title,
    amount,
    currency = "ILS",
    imageUrl,
    description,
    recipientName,
    brandName = process.env.NEXT_PUBLIC_BRAND_NAME || "ManageVent",
    brandLogoUrl = process.env.NEXT_PUBLIC_BRAND_LOGO_URL ||
      `${(process.env.NEXT_PUBLIC_SITE_URL || "").replace(/\/$/, "")}/logo.png`,
    brandPrimary = process.env.NEXT_PUBLIC_BRAND_PRIMARY || "#3b82f6",
    supportEmail = process.env.NEXT_PUBLIC_BRAND_SUPPORT_EMAIL ||
      "info@managevent.co.il",
  } = args;

  const base = process.env.NEXT_PUBLIC_SITE_URL || "";
  const href = link.startsWith("http")
    ? link
    : `${base}${link.startsWith("/") ? "" : "/"}${link}`;

  const safeAmount =
    typeof amount === "number" && amount > 0
      ? `${amount.toFixed(2)} ${currency}`
      : null;

  const preheader = `בקשת תשלום – ${title}${safeAmount ? ` · ${safeAmount}` : ""}`;

  // --- HTML (inline styles + טבלה ידידותית לקליינטים של מייל) ---
  const html = `
<!doctype html>
<html lang="he" dir="rtl">
  <head>
    <meta charset="utf-8" />
    <meta name="color-scheme" content="light only">
    <meta name="supported-color-schemes" content="light">
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>בקשת תשלום</title>
    <style>
      /* תיקוני RTL עבור לקוחות שמכבדים <style> */
      .rtl { direction: rtl; text-align: right; }
      .btn:hover { filter: brightness(0.95); }
      .breakword { word-break: break-word; }
      @media (max-width: 600px) {
        .container { width: 100% !important; }
      }
    </style>
  </head>
  <body style="margin:0;padding:0;background:#f6f7fb;">
    <!-- Preheader (נסתר) -->
    <div style="display:none;max-height:0;overflow:hidden;opacity:0;">
      ${preheader}
    </div>
    <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background:#f6f7fb;">
      <tr>
        <td align="center" style="padding:24px;">
          <table class="container" role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="width:600px;max-width:100%;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
            <!-- Header -->
            <tr>
              <td align="center" style="background:#ffffff;padding:20px 24px;border-bottom:1px solid #f1f5f9;">
                <img src="${brandLogoUrl}" alt="${brandName}" width="140" style="display:block;max-width:180px;height:auto;margin:0 auto 4px;" />
                <div style="font:14px/1.4 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#64748b;">${brandName}</div>
              </td>
            </tr>

            <!-- Hero -->
            <tr>
              <td class="rtl" style="padding:24px 24px 8px 24px;background:#ffffff;">
                <h1 style="margin:0 0 10px 0;font:700 20px/1.4 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#0f172a;">בקשת תשלום</h1>
                <p style="margin:0 0 8px 0;font:16px/1.7 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#111827;">
                  ${recipientName ? `שלום ${recipientName},` : "שלום,"}
                </p>
                <p class="breakword" style="margin:0 0 6px 0;font:16px/1.7 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#111827;">
                  יש לך בקשת תשלום עבור: <b>${escapeHtml(title)}</b>
                </p>
                ${
                  safeAmount
                    ? `<p style="margin:0 0 12px 0;font:16px/1.7 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#111827;">
                       סכום לתשלום: <b>${safeAmount}</b>
                     </p>`
                    : ""
                }
                ${
                  description
                    ? `<p style="margin:0 0 12px 0;font:15px/1.8 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#334155;">
                       ${escapeHtml(description)}
                     </p>`
                    : ""
                }
              </td>
            </tr>

            ${
              imageUrl
                ? `
            <!-- Image -->
            <tr>
              <td align="center" style="padding:0 24px 8px 24px;background:#ffffff;">
                <img src="${imageUrl}" alt="" style="display:block;max-width:100%;border-radius:10px;border:1px solid #e5e7eb;" />
              </td>
            </tr>`
                : ""
            }

            <!-- CTA -->
            <tr>
              <td align="center" style="padding:16px 24px 24px 24px;background:#ffffff;">
                <a class="btn" href="${href}" target="_blank"
                   style="display:inline-block;padding:12px 20px;border-radius:10px;border:1px solid ${brandPrimary};
                          text-decoration:none;font:600 15px/1 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:${brandPrimary};">
                  לתשלום לחץ כאן
                </a>
                <div class="rtl" style="margin-top:12px;font:13px/1.6 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#64748b;">
                  אם הכפתור לא עובד, ניתן להעתיק את הקישור:
                </div>
                <div class="rtl breakword" style="margin-top:6px;font:12px/1.6 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#334155;">
                  <a href="${href}" style="color:#334155;text-decoration:underline;">${href}</a>
                </div>
              </td>
            </tr>

            <!-- Footer -->
            <tr>
              <td class="rtl" style="padding:16px 24px 20px 24px;background:#f8fafc;border-top:1px solid #eef2f7;">
                <p style="margin:0 0 6px 0;font:12px/1.7 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#64748b;">
                  הודעה זו נשלחה אוטומטית מטעם <b>${brandName}</b>.
                </p>
                <p style="margin:0;font:12px/1.7 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#64748b;">
                  צריך עזרה? כתבו לנו: <a href="mailto:${supportEmail}" style="color:#64748b;">${supportEmail}</a>
                </p>
              </td>
            </tr>
          </table>

          <!-- Legal line -->
          <div class="rtl" style="max-width:600px;margin:10px auto 0;font:11px/1.6 Arial,Helvetica,'Segoe UI',Tahoma,sans-serif;color:#94a3b8;">
            © ${new Date().getFullYear()} ${brandName}. כל הזכויות שמורות.
          </div>
        </td>
      </tr>
    </table>
  </body>
</html>
  `.trim();

  // --- TEXT fallback (פשוט, נקי) ---
  const textLines: string[] = [];
  textLines.push(recipientName ? `שלום ${recipientName},` : "שלום,");
  textLines.push(`בקשת תשלום: ${title}`);
  if (safeAmount) textLines.push(`סכום: ${safeAmount}`);
  if (description) textLines.push(`תיאור: ${stripHtml(description)}`);
  textLines.push(`לתשלום: ${href}`);
  textLines.push("");
  textLines.push(`תודה,`);
  textLines.push(brandName);
  const text = textLines.join("\n");

  await resend.emails.send({
    from: `ManagEvent <info@managevent.co.il>`,
    to,
    subject: `בקשת תשלום – ${title}${safeAmount ? ` (${safeAmount})` : ""}`,
    html,
    text,
    headers: {
      "X-Entity-Ref-ID": `payreq-${Date.now()}`, // אופציונלי לזיהוי
    },
  });
}

/* ===== עזר קטן לאבטחת טקסטים בתבנית ===== */

function escapeHtml(s: string) {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}
function stripHtml(s: string) {
  return s.replace(/<[^>]*>/g, "");
}
