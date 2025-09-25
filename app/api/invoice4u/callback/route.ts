// app/api/invoice4u/callback/route.ts
import { NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import PaymentRequest from "@/models/PaymentRequest";

/**
 * Callback מספק הסליקה (Invoice4U/דומה)
 * - מזהה את ה-PR לפי token מה-URL ?token=... או לפי OrderIdClientUsage שנשלח חזרה בגוף
 * - קובע אם העסקה "שולמה" לפי מספר דגלים אפשריים בתשובה
 * - מעדכן רק שדות קיימים בסכמה: status, uses (+respect usageLimit), description (אופציונלי)
 *
 * ⚠️ חשוב: יש להוסיף אימות חתימה/סוד (HMAC/Hash) לפי תיעוד הספק! (TODO)
 */

// קריאת payload בפורמטים שונים (JSON / form-data / x-www-form-urlencoded)
async function readPayload(req: Request): Promise<Record<string, any>> {
  // נסה JSON
  try {
    const json = await req.json();
    if (json && typeof json === "object") return json;
  } catch {
    // ignore
  }
  // נסה formData
  try {
    const form = await req.formData();
    const obj: Record<string, any> = {};
    for (const [k, v] of form.entries()) obj[k] = v;
    if (Object.keys(obj).length > 0) return obj;
  } catch {
    // ignore
  }
  // נסה כטקסט (x-www-form-urlencoded)
  try {
    const text = await req.text();
    if (text) {
      const sp = new URLSearchParams(text);
      const obj: Record<string, any> = {};
      for (const [k, v] of sp.entries()) obj[k] = v;
      if (Object.keys(obj).length > 0) return obj;
    }
  } catch {
    // ignore
  }
  return {};
}

// קביעה האם שולם — מנסה מגוון שדות ידועים
function isPaid(payload: Record<string, any>): boolean {
  const flagStrings = [
    String(payload?.Status || "").toLowerCase(),
    String(payload?.Result || "").toLowerCase(),
    String(payload?.State || "").toLowerCase(),
  ];
  const hasApprovedWord = flagStrings.some((s) =>
    ["paid", "success", "approved", "ok"].includes(s)
  );

  const truthyBools =
    payload?.Paid === true ||
    payload?.IsApproved === true ||
    payload?.Success === true ||
    payload?.Approved === true;

  const goodCodes = ["0", "00", "000", "1"];
  const codeOk =
    goodCodes.includes(String(payload?.StatusCode ?? "")) ||
    goodCodes.includes(String(payload?.ResponseCode ?? "")) ||
    goodCodes.includes(String(payload?.ResponseStatus ?? ""));

  return Boolean(hasApprovedWord || truthyBools || codeOk);
}

export async function POST(req: Request) {
  try {
    await connectToDatabase();

    const url = new URL(req.url);
    const tokenFromQuery = url.searchParams.get("token") || undefined;

    const payload = await readPayload(req);

    // מזהה פנימי שלנו שהעברנו ב-ProcessApiRequestV2
    const orderIdClientUsage: string | undefined =
      payload?.OrderIdClientUsage || payload?.orderIdClientUsage;

    // מזהה עסקה של הספק (אופציונלי בלבד — לא משתמשים בו לחיפוש במסד)
    const txId: string | undefined =
      payload?.TransactionId ||
      payload?.PaymentId ||
      payload?.DealId ||
      payload?.TransactionID ||
      payload?.TxId ||
      undefined;

    // TODO: אימות חתימה/Hash לפי תיעוד הספק לפני כל עדכון

    // חיפוש ה-PR:
    // עדיפות 1 — token מה-URL
    // עדיפות 2 — OrderIdClientUsage אם בחרנו להשתמש בו כ-token כששלחנו את הבקשה
    let pr = null;
    if (tokenFromQuery) {
      pr = await PaymentRequest.findOne({ token: tokenFromQuery });
    }
    if (!pr && orderIdClientUsage) {
      pr = await PaymentRequest.findOne({ token: orderIdClientUsage });
    }

    if (!pr) {
      return NextResponse.json(
        {
          error:
            "payment request not found (missing or unknown token / OrderIdClientUsage)",
        },
        { status: 404 }
      );
    }

    // אם כבר שולם — נשיב OK (אידמפוטנטיות)
    if (pr.status === "paid") {
      return NextResponse.json({ ok: true, alreadyPaid: true });
    }

    const paid = isPaid(payload);

    if (paid) {
      // 1) סטטוס
      pr.status = "paid";

      // 2) uses תוך כיבוד usageLimit
      if (typeof pr.usageLimit === "number" && pr.usageLimit > 0) {
        pr.uses = Math.min((pr.uses ?? 0) + 1, pr.usageLimit);
      } else {
        pr.uses = (pr.uses ?? 0) + 1;
      }

      // 3) אופציונלי: הזרקת מזהי ספק לתיאור (ללא שינוי סכימה)
      if (payload?.DocId || payload?.DocNumber || txId) {
        const suffix = `\n[Invoice4U] ${
          txId ? `Tx=${txId}, ` : ""
        }DocId=${payload?.DocId ?? "-"}, DocNumber=${
          payload?.DocNumber ?? "-"
        }`;
        pr.description = (pr.description || "") + suffix;
      }

      await pr.save();
    }

    return NextResponse.json({ ok: true, paid });
  } catch (err: any) {
    console.error("POST /api/invoice4u/callback error:", err);
    return NextResponse.json({ error: "internal error" }, { status: 500 });
  }
}
