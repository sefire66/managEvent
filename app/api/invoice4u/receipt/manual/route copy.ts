import { NextResponse } from "next/server";
import { createReceipt, sendDocumentByMail } from "@/lib/invoice4u";

const DEFAULT_CLIENT_ID = 7170864; // כפי שכתבת

export async function POST(req: Request) {
  try {
    const {
      amount, // חובה: סכום הקבלה
      subject, // כותרת (נכנס ל-Subject)
      buyerName, // אופציונלי
      buyerEmail, // אופציונלי (אם תשלח מייל דרך AssociatedEmails או SendDocumentByMail)
      notes, // אופציונלי: הסבר קצר (נצמיד ל-Subject)
      currency = "ILS", // "ILS" ברירת מחדל
      clientId = DEFAULT_CLIENT_ID, // יש לך לקוח שמור במערכת
      externalTransactionId, // אופציונלי: ל-idempotency
      provider, // אופציונלי: "manual"
      providerMethod, // אופציונלי: "cash" | "bank_transfer" | "credit_card" | ...
      sendMail = true, // לשלוח מייל אחרי הנפקת המסמך
    } = await req.json();

    if (!(amount > 0)) {
      return NextResponse.json(
        { error: "amount must be > 0" },
        { status: 400 }
      );
    }

    const receipt = await createReceipt({
      amount: Number(amount),
      currency: "ILS",
      itemName: subject || "תשלום בדיקה",
      // clientId: 7170864, // אם זה באמת קיים אצלך ב-Invoice4U
      provider: "manual",
      providerMethod: "cash",
      paymentTypeOverride: 1, // מזומן — הכי פשוט
    });

    // 1) הפקת קבלה (DocumentType=2) עם ClientID קיים
    // const receipt = await createReceipt({
    //   amount: Number(amount),
    //   currency,
    //   itemName: subject || "תשלום",
    //   buyerName: buyerName || null,
    //   buyerEmail: buyerEmail || null, // ייכנס גם ל-AssociatedEmails בתוך המסמך
    //   notes: notes || null,
    //   externalTransactionId: externalTransactionId || null, // מונע כפילויות אם חוזרים עם אותו מזהה
    //   clientId, // ← כאן השימוש ב-7170864
    //   provider: provider || "manual",
    //   providerMethod: providerMethod || "manual",
    //   paymentTypeOverride: null, // אם תרצה לאלץ קוד ספציפי ל-PaymentType
    //   generalCustomerIdentifier: null,
    // });

    // receipt = { docId?, docNumber?, docUrl?, raw }
    if (!receipt?.docId) {
      // גם אם אין docId אבל יש docUrl/number—תחליט איך לטפל. לרוב אמור להגיע docId.
      return NextResponse.json(
        { error: "CreateDocument returned no docId", receipt },
        { status: 500 }
      );
    }

    // 2) שליחה במייל
    let mailResult: any = { ok: false, skipped: true };
    if (sendMail && buyerEmail) {
      mailResult = await sendDocumentByMail({
        docId: receipt.docId,
        to: [buyerEmail],
        ccUserEmail: process.env.BUSINESS_EMAIL || null, // ישלח עם IsUserMail=true
      });
    }

    return NextResponse.json({
      ok: true,
      docId: receipt.docId,
      docNumber: receipt.docNumber,
      docUrl: receipt.docUrl,
      mailed: mailResult,
    });
  } catch (err: any) {
    return NextResponse.json(
      { error: err?.message || "server error" },
      { status: 500 }
    );
  }
}
