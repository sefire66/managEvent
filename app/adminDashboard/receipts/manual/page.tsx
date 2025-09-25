"use client";

import { useState } from "react";

type Mode = "invoiceReceipt" | "receiptAgainstInvoice";

export default function ManualReceiptPage() {
  const [mode, setMode] = useState<Mode>("invoiceReceipt");

  const [amount, setAmount] = useState<number | "">("");
  const [subject, setSubject] = useState("");
  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [notes, setNotes] = useState("");

  // שדות ייעודיים למסלולים
  const [clientId, setClientId] = useState<number | "">(33449); // ← דיפולט 33449
  const [invoiceId, setInvoiceId] = useState("");

  // אמצעי תשלום: 3=העברה בנקאית, 4=אשראי/אחר
  const [paymentType, setPaymentType] = useState<3 | 4>(3);

  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [result, setResult] = useState<{
    docId?: string;
    docNumber?: string;
    docUrl?: string;
  } | null>(null);

  function isGuidLike(v: string) {
    return /^[0-9a-fA-F-]{20,}$/.test(v.trim());
  }

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setResult(null);

    const amt = typeof amount === "number" ? amount : Number(amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      setErr("סכום לא תקין");
      return;
    }

    // ClientID חובה בשני המצבים (בהתאם לדוגמה הרשמית)
    const cid = typeof clientId === "number" ? clientId : Number(clientId);
    if (!Number.isFinite(cid) || cid <= 0) {
      setErr("ClientID נדרש");
      return;
    }

    // ולידציה למסלול קבלה כנגד חשבונית
    if (mode === "receiptAgainstInvoice") {
      if (!invoiceId || !isGuidLike(invoiceId)) {
        setErr("Invoice ID (GUID) נדרש במסלול 'קבלה כנגד חשבונית'");
        return;
      }
    }

    setLoading(true);
    try {
      const body: any = {
        mode, // "invoiceReceipt" | "receiptAgainstInvoice"
        amount: amt,
        subject:
          subject || (mode === "invoiceReceipt" ? "חשבונית-קבלה" : "קבלה"),
        buyerName: buyerName || undefined,
        buyerEmail: buyerEmail || undefined,
        notes: notes || undefined,
        currency: "ILS",
        paymentType, // 3/4 – בצד שרת נכפה ל-PaymentType
        externalTransactionId: `${
          mode === "invoiceReceipt" ? "IR" : "RID"
        }-${Date.now()}`,
        sendMail: !!buyerEmail, // שליחה רק אם יש אימייל
        clientId: Number(cid), // ← תמיד שולחים ClientID (חובה ב-InvoiceReceipt)
      };

      if (mode === "receiptAgainstInvoice") {
        body.invoiceId = invoiceId.trim();
      }

      const res = await fetch("/api/invoice4u/receipt/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error || "שגיאה בהנפקה");

      setResult({
        docId: json.docId,
        docNumber: json.docNumber,
        docUrl: json.docUrl,
      });
    } catch (e: any) {
      setErr(e.message || "שגיאה");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-gray-100 py-10" dir="rtl">
      <div className="max-w-xl mx-auto bg-white rounded-xl shadow p-5 mt-20">
        <h1 className="text-2xl font-bold mb-4">הנפקה ידנית</h1>

        {/* מצב עבודה */}
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setMode("invoiceReceipt")}
            className={`w-full rounded-lg py-2 text-sm border ${
              mode === "invoiceReceipt"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white"
            }`}
          >
            חשבונית־קבלה (DocumentType=3)
          </button>
          <button
            type="button"
            onClick={() => setMode("receiptAgainstInvoice")}
            className={`w-full rounded-lg py-2 text-sm border ${
              mode === "receiptAgainstInvoice"
                ? "bg-blue-600 text-white border-blue-600"
                : "bg-white"
            }`}
          >
            קבלה כנגד חשבונית (DocumentType=2)
          </button>
        </div>

        {/* התראות / תוצאות */}
        {err && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded p-3 mb-3 text-sm">
            {err}
          </div>
        )}

        {result ? (
          <div className="bg-green-50 border border-green-200 text-green-800 rounded p-3 mb-4 text-sm">
            <div className="font-semibold">המסמך הונפק בהצלחה ✔️</div>
            {result.docNumber && <div>מס׳ מסמך: {result.docNumber}</div>}
            {result.docUrl && (
              <div className="mt-1">
                <a
                  href={result.docUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="underline text-green-700"
                >
                  צפייה במסמך
                </a>
              </div>
            )}
          </div>
        ) : null}

        <form onSubmit={submit} className="space-y-3">
          {/* סכום */}
          <label className="block">
            <span className="text-sm">סכום (₪)</span>
            <input
              type="number"
              inputMode="decimal"
              min="0"
              step="0.01"
              value={amount}
              onChange={(e) =>
                setAmount(e.target.value === "" ? "" : Number(e.target.value))
              }
              className="mt-1 block w-full border rounded px-3 py-2"
              required
            />
          </label>

          {/* נושא */}
          <label className="block">
            <span className="text-sm">נושא</span>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              placeholder={
                mode === "invoiceReceipt"
                  ? "למשל: חשבונית-קבלה עבור הזמנה #1234"
                  : "למשל: קבלה עבור חשבונית #INV"
              }
            />
          </label>

          {/* פרטי לקוח */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <label className="block">
              <span className="text-sm">מספר לקוח (ClientID) — חובה</span>
              <input
                type="number"
                inputMode="numeric"
                min="0"
                step="1"
                value={clientId}
                onChange={(e) =>
                  setClientId(
                    e.target.value === "" ? "" : Number(e.target.value)
                  )
                }
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="לדוגמה: 33449"
              />
            </label>

            <label className="block">
              <span className="text-sm">שם לקוח (אופציונלי)</span>
              <input
                type="text"
                value={buyerName}
                onChange={(e) => setBuyerName(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="למשל: דני כהן"
              />
            </label>
          </div>

          {/* Invoice ID למסלול קבלה-כנגד-חשבונית */}
          {mode === "receiptAgainstInvoice" && (
            <label className="block">
              <span className="text-sm">Invoice ID (GUID) — חובה</span>
              <input
                type="text"
                value={invoiceId}
                onChange={(e) => setInvoiceId(e.target.value)}
                className="mt-1 block w-full border rounded px-3 py-2"
                placeholder="לדוגמה: b638130c-4abd-439f-bd63-98571f3f71f3"
              />
            </label>
          )}

          {/* אימייל לשליחה */}
          <label className="block">
            <span className="text-sm">אימייל לקוח (לשליחת המסמך)</span>
            <input
              type="email"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              placeholder="client@example.com"
            />
          </label>

          {/* אמצעי תשלום */}
          <label className="block">
            <span className="text-sm">אמצעי תשלום</span>
            <select
              value={paymentType}
              onChange={(e) =>
                setPaymentType(Number(e.target.value) === 4 ? 4 : 3)
              }
              className="mt-1 block w-full border rounded px-3 py-2"
            >
              <option value={3}>העברה בנקאית (מומלץ)</option>
              <option value={4}>אשראי / אחר</option>
            </select>
          </label>

          {/* הערות */}
          <label className="block">
            <span className="text-sm">הערות (אופציונלי)</span>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="mt-1 block w-full border rounded px-3 py-2"
              rows={3}
              placeholder="למשל: שולם ידנית, ללא סליקה"
            />
          </label>

          <button
            type="submit"
            disabled={loading || !amount}
            className={`w-full rounded-lg py-2.5 text-white ${
              loading ? "bg-gray-400" : "bg-blue-600 hover:bg-blue-700"
            }`}
          >
            {loading
              ? "מנפיק…"
              : mode === "invoiceReceipt"
                ? "הנפקת חשבונית־קבלה"
                : "הנפקת קבלה כנגד חשבונית"}
          </button>
        </form>

        <p className="text-xs text-gray-500 mt-4">
          במסלול <b>חשבונית־קבלה</b> יש להזין <b>ClientID</b> (כמו בדוגמה הרשמית
          של Invoice4U REST). במסלול <b>קבלה כנגד חשבונית</b> נדרש גם{" "}
          <b>Invoice ID (GUID)</b>. ההנפקה והשליחה נעשות בצד השרת (VerifyLogin).
        </p>
      </div>
    </div>
  );
}
