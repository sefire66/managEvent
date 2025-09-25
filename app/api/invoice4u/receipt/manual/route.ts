// app/api/invoice4u/receipt/manual/route.ts
import { NextResponse } from "next/server";
import { createTaxInvoice, sendDocumentByMail } from "@/lib/invoice4u";

export const runtime = "nodejs"; // מתאים גם ל-fetch בצד שרת

export async function POST(req: Request) {
  try {
    const body = await req.json();

    const {
      mode, // "invoiceReceipt" | "receiptAgainstInvoice" (כרגע משתמשים ב-InvoiceReceipt)
      amount,
      subject,
      clientId, // חובה לפי הדוגמה הרשמית
      buyerEmail,
      currency = "ILS",
      paymentType = 3, // 3=העברה, 4=אשראי/אחר
      externalTransactionId,
    } = body || {};

    const amt = Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      return NextResponse.json(
        { error: "amount must be > 0" },
        { status: 400 }
      );
    }

    const cid = Number(clientId);
    if (!Number.isFinite(cid) || cid <= 0) {
      return NextResponse.json(
        { error: "clientId is required" },
        { status: 400 }
      );
    }

    // מנפיקים חשבונית־קבלה (DocumentType=3) לפי דוגמת Postman
    const invrec = await createTaxInvoice({
      docType: "InvoiceReceipt",
      clientId: cid,
      amount: amt,
      itemName: subject || "חשבונית-קבלה",
      currency,
      buyerEmail: buyerEmail || undefined,
      // אם צריך מע״מ — שנה לערך נכון (למשל 17). כרגע 0 כמו בקוד המקורי.
      vatRate: 0,
      externalTransactionId: externalTransactionId || `IR-${Date.now()}`,
      // מיפוי 1:1 לפרמטר הישן
      paymentTypeOverride: Number(paymentType) === 4 ? 4 : 3,
    });

    if (!invrec?.docId) {
      return NextResponse.json(
        { error: "CreateDocument returned no docId", invrec },
        { status: 500 }
      );
    }

    if (buyerEmail) {
      try {
        await sendDocumentByMail({
          docId: String(invrec.docId),
          to: [buyerEmail],
          ccUserEmail: process.env.BUSINESS_EMAIL || null,
        });
      } catch (e) {
        // לא מפילים את ההנפקה אם המייל נכשל
        console.warn("SendDocumentByMail failed:", (e as any)?.message || e);
      }
    }

    return NextResponse.json({
      ok: true,
      docId: invrec.docId,
      docNumber: invrec.docNumber,
      docUrl: invrec.docUrl,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
