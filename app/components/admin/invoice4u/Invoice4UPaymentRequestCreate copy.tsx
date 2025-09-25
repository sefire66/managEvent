"use client";

import React, { useEffect, useMemo, useState } from "react";

/**
 * Invoice4UPaymentRequestCreate — יצירת לינק לתשלום (ללא חיוב בפועל)
 * - מושך מע״מ מ-Billing Profile (ברירת מחדל: פרופיל דיפולט/אחרון בשימוש)
 * - יוצר בקשה ל-API שלנו: /api/invoice4u/payment-links
 * - ה-API מתקשר אל ProcessApiRequestV2 ומחזיר ClearingRedirectUrl
 * - שומר את הבקשה ב-DB (PaymentRequest) ושולח מייל לנמען עם הקישור
 */

export type CreateResult = {
  ok: boolean;
  token?: string | null;
  shortUrl?: string | null;
  error?: string;
};

export type BillingProfileUI = {
  _id: string;
  title?: string | null;
  isDefault?: boolean | null;
  lastUsedAt?: string | null;
  currency?: string | null;
  vatRate?: number | null;
  vatPercent?: number | null;
  vat?: number | null;
  businessName?: string | null;
  buisinessName?: string | null; // תמיכה בטעות כתיב
};

export type Invoice4UPaymentRequestCreateProps = {
  userId: string; // ← חובה כדי לשייך את הרשומה
  userName?: string;
  userEmail?: string;
  userPhone?: string;

  defaultCurrency?: string;
  defaultVatRate?: number; // אחוז
  defaultCreditCardCompanyType?: string; // "6"/"7"/"12"
  apiKey?: string; // אם לא שולחים מהלקוח — השרת ישלים
  returnUrl?: string;
  callbackUrl?: string;

  onClose: () => void;
  onCreated?: (token?: string | null) => void;
  createEndpoint?: string; // דיפולט: "/api/invoice4u/payment-links"
};

export default function Invoice4UPaymentRequestCreate({
  userId,
  userName,
  userEmail,
  userPhone,
  defaultCurrency = "ILS",
  defaultVatRate = 17,
  defaultCreditCardCompanyType = "",
  apiKey = "",
  returnUrl,
  callbackUrl,
  onClose,
  onCreated,
  createEndpoint = "/api/invoice4u/payment-links",
}: Invoice4UPaymentRequestCreateProps) {
  // ---- payer ----
  const [payerName, setPayerName] = useState(userName || "");
  const [payerEmail, setPayerEmail] = useState(userEmail || "");
  const [payerPhone, setPayerPhone] = useState(userPhone || "");

  // ---- request ----
  const [title, setTitle] = useState(""); // Description
  const [description, setDescription] = useState(""); // DocComments
  const [amount, setAmount] = useState<number>(0); // gross
  const [vatRate, setVatRate] = useState<number>(defaultVatRate);
  const [vatAmount, setVatAmount] = useState<number>(0);
  const [currency, setCurrency] = useState<string>(defaultCurrency);
  const [orderId, setOrderId] = useState<string>("");
  const [creditCardCompanyType, setCreditCardCompanyType] = useState<string>(
    defaultCreditCardCompanyType
  );
  const [uiApiKey, setUiApiKey] = useState<string>(apiKey || "");

  // ---- document (optional) ----
  const [createDoc, setCreateDoc] = useState(true);
  const [docHeadline, setDocHeadline] = useState("חשבונית מס קבלה");
  const [docItemName, setDocItemName] = useState("תשלום אונליין");
  const [docComments, setDocComments] = useState("");
  const [clientMode, setClientMode] = useState<"general" | "autoCreate">(
    "autoCreate"
  );

  // ---- links ----
  const [retUrl, setRetUrl] = useState(returnUrl || "");
  const [cbUrl, setCbUrl] = useState(callbackUrl || "");

  // ---- Billing Profiles / VAT ----
  const [profiles, setProfiles] = useState<BillingProfileUI[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string>("");
  const [loadingVat, setLoadingVat] = useState(false);
  const [vatError, setVatError] = useState<string | null>(null);

  // ---- UX ----
  const [submitting, setSubmitting] = useState(false);
  const [justCreated, setJustCreated] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // ---- helpers ----
  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const asMoney = (n: number) => round2(n).toFixed(2);
  const isEmail = (s: string) => /.+@.+[.].+/.test(s);
  const isPhone = (s: string) => s.replace(/[^0-9]/g, "").length >= 7;

  const net = useMemo(
    () => Math.max(0, round2(amount - vatAmount)),
    [amount, vatAmount]
  );

  function profileDisplayName(p: BillingProfileUI) {
    // עדיפות: businessName → buisinessName → title → _id
    return p.businessName || p.buisinessName || p.title || p._id;
  }

  function syncFromGross(next: number) {
    const g = Math.max(0, Number(next) || 0);
    const v = vatRate > 0 ? round2((g * vatRate) / (100 + vatRate)) : 0;
    setAmount(g);
    setVatAmount(v);
  }
  function syncFromNet(next: number) {
    const n = Math.max(0, Number(next) || 0);
    const g = vatRate > 0 ? round2(n * (1 + vatRate / 100)) : n;
    setAmount(g);
    setVatAmount(round2(g - n));
  }
  function onVatRateChange(r: number) {
    const rate = Math.max(0, Math.min(100, Number(r) || 0));
    setVatRate(rate);
    const v = rate > 0 ? round2((amount * rate) / (100 + rate)) : 0;
    setVatAmount(v);
  }

  // ===== Billing Profile VAT loader =====
  function getVatFromProfile(p?: BillingProfileUI | null): number | null {
    if (!p) return null;
    const candidates = [p.vatRate, p.vatPercent, p.vat].filter(
      (x): x is number => typeof x === "number" && isFinite(x)
    );
    if (candidates.length > 0) return candidates[0]!;
    return null;
  }

  function applyProfile(p?: BillingProfileUI | null) {
    if (!p) return;
    // VAT
    const prVat = getVatFromProfile(p);
    if (prVat != null) {
      setVatRate(prVat);
      setVatAmount((prev) => {
        const g = amount;
        const v = prVat > 0 ? round2((g * prVat) / (100 + prVat)) : 0;
        return v;
      });
    }
    // מטבע (אם מגיע מהפרופיל)
    if (p.currency && typeof p.currency === "string") {
      setCurrency(p.currency);
    }
  }

  function buildProfilesUrl() {
    const base = "/api/billing-profile?list=1";
    if (userId) return `${base}&ownerUserId=${encodeURIComponent(userId)}`;
    return base;
  }

  async function fetchProfiles() {
    setLoadingVat(true);
    setVatError(null);
    try {
      const url = buildProfilesUrl();
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      let list: BillingProfileUI[] = [];
      if (!res.ok) {
        throw new Error(data?.error || "שגיאה בשליפת פרופילי חיוב");
      }
      if (Array.isArray(data)) {
        list = data as BillingProfileUI[];
      } else if (data && typeof data === "object") {
        list = [data as BillingProfileUI];
      }

      setProfiles(list);

      if (list.length === 0) {
        setSelectedProfileId("");
        setVatError("לא נמצאו פרופילי חיוב ללקוח זה. יש להגדיר מראש.");
        onVatRateChange(defaultVatRate);
        return;
      }

      // בחירה אוטומטית: isDefault > lastUsedAt חדש ביותר > הראשון
      let chosen: BillingProfileUI | undefined =
        list.find((p) => p.isDefault) ||
        [...list].sort((a, b) => {
          const ta = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
          const tb = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
          return tb - ta;
        })[0] ||
        list[0];

      if (chosen) {
        setSelectedProfileId(chosen._id);
        applyProfile(chosen);
      }
    } catch (e: any) {
      setVatError(e?.message || "שגיאה בשליפת פרופילי חיוב");
      onVatRateChange(defaultVatRate);
    } finally {
      setLoadingVat(false);
    }
  }

  // Prefill פרטי לקוח והבאת פרופילי חיוב
  useEffect(() => {
    if (userName && !payerName) setPayerName(userName);
    if (userEmail && !payerEmail) setPayerEmail(userEmail);
    if (userPhone && !payerPhone) setPayerPhone(userPhone);
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // החלפת פרופיל ידנית
  useEffect(() => {
    if (!selectedProfileId) return;
    const p = profiles.find((x) => x._id === selectedProfileId);
    applyProfile(p);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedProfileId]);

  // ===== Validation =====
  const isValid = useMemo(() => {
    if (!title.trim()) return false;
    if (!payerName.trim()) return false;
    if (!isEmail(payerEmail.trim())) return false;
    if (!isPhone(payerPhone.trim())) return false;
    if (!(amount > 0)) return false;
    if (createDoc && !docItemName.trim()) return false;
    return true;
  }, [
    title,
    payerName,
    payerEmail,
    payerPhone,
    amount,
    createDoc,
    docItemName,
  ]);

  // ===== Submit (יצירת לינק בלבד + שמירה + שליחת מייל) =====
  async function handleSubmit() {
    if (!isValid || submitting) return;
    try {
      setSubmitting(true);
      setError(null);

      const payload = {
        // מזהה בעלים / יוצר (שדה חובה בשרת)
        ownerUserId: userId,
        createdBy: userId,

        // payer
        payerName: payerName.trim(),
        payerEmail: payerEmail.trim(),
        payerPhone: payerPhone.trim(),

        // business
        title: title.trim(),
        description: description.trim() || undefined,
        amount: Number(asMoney(amount)), // שומר 2 ספרות
        vatRate: Math.round(vatRate),
        vatAmount: Number(asMoney(vatAmount)),
        currency: (currency || "ILS").trim(),
        orderId: (orderId || "").trim(),

        // document
        createDoc: !!createDoc,
        docHeadline: createDoc ? docHeadline.trim() : undefined,
        docItemName: createDoc ? docItemName.trim() : undefined,
        docComments: createDoc
          ? docComments.trim() || description.trim() || undefined
          : undefined,
        clientMode: createDoc
          ? (clientMode as "general" | "autoCreate")
          : undefined,

        // provider
        creditCardCompanyType:
          (creditCardCompanyType || "").trim() || undefined,
        apiKey: (uiApiKey || "").trim() || undefined,
        callbackUrl: (cbUrl || "").trim() || undefined,
        returnUrl: (retUrl || "").trim() || undefined,

        // mail
        sendEmailTo: payerEmail.trim(),
      };

      const res = await fetch(createEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err?.error || "failed to create hosted link");
      }

      const data = (await res.json()) as CreateResult & {
        token?: string;
        shortUrl?: string;
      };

      setJustCreated(true);
      setTimeout(() => setJustCreated(false), 2500);
      onCreated?.(data?.token || null);
    } catch (e: any) {
      console.error(e);
      setError(e?.message || "שגיאה בבקשה");
    } finally {
      setSubmitting(false);
    }
  }

  // ==================== Render ====================
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/30"
      dir="rtl"
    >
      <div className="bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[85vh] overflow-y-auto">
        {/* Header */}
        <div className="px-4 py-3 border-b flex items-center justify-between">
          <div className="text-lg font-semibold">
            בקשת תשלום חדשה — יצירת לינק (Invoice4U)
          </div>
          <button
            onClick={onClose}
            className="text-sm px-2 py-1 hover:bg-gray-100 rounded"
          >
            סגור
          </button>
        </div>

        {/* Body */}
        <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-4 text-[16px]">
          {/* פרופיל חיוב / מע״מ */}
          <Section title="פרופיל חיוב (מע״מ)">
            <div className="grid grid-cols-[1fr_auto] gap-2 items-end">
              <Field label="בחר פרופיל חיוב">
                <select
                  value={selectedProfileId}
                  onChange={(e) => setSelectedProfileId(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                >
                  {profiles.length === 0 ? (
                    <option value="">— אין פרופילים זמינים —</option>
                  ) : (
                    profiles.map((p) => (
                      <option key={p._id} value={p._id}>
                        {profileDisplayName(p)}
                        {p.isDefault ? " · ברירת מחדל" : ""}
                      </option>
                    ))
                  )}
                </select>
              </Field>
              <button
                onClick={fetchProfiles}
                className="h-9 px-3 rounded border hover:bg-gray-50"
                disabled={loadingVat}
                title="רענן פרופילי חיוב"
              >
                {loadingVat ? "טוען…" : "רענן"}
              </button>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              שיעור מע״מ פעיל: <b>{Math.round(vatRate)}%</b>
              {currency ? ` · מטבע: ${currency}` : null}
            </div>
            {vatError && (
              <div className="text-xs text-red-700 mt-1">{vatError}</div>
            )}
          </Section>

          {/* פרטי משלם */}
          <Section title="פרטי משלם">
            <Field label="שם מלא" required>
              <input
                value={payerName}
                onChange={(e) => setPayerName(e.target.value)}
                className="w-full h-9 px-2 border rounded"
              />
            </Field>
            <Field label="אימייל" required>
              <input
                type="email"
                value={payerEmail}
                onChange={(e) => setPayerEmail(e.target.value)}
                className="w-full h-9 px-2 border rounded"
              />
            </Field>
            <Field label="טלפון" required>
              <input
                value={payerPhone}
                onChange={(e) => setPayerPhone(e.target.value)}
                className="w-full h-9 px-2 border rounded"
              />
            </Field>
          </Section>

          {/* פרטי עסקה */}
          <Section title="פרטי עסקה">
            <Field label="כותרת לתיאור העסקה (Description)" required>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full h-9 px-2 border rounded"
                placeholder="למשל: תשלום עבור חבילת שירות"
              />
            </Field>
            <Field label="תיאור למסמך (DocComments)">
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full h-20 px-2 py-1 border rounded"
              />
            </Field>
            <div className="grid grid-cols-2 gap-2">
              <Field label="ברוטו (₪)" required>
                <NumberInput value={amount} onChange={syncFromGross} min={0} />
              </Field>
              <Field label={"לפני מע״מ (₪)"}>
                <NumberInput value={net} onChange={syncFromNet} min={0} />
              </Field>
              <Field label={"שיעור מע״מ (%)"}>
                <NumberInput
                  value={vatRate}
                  onChange={onVatRateChange}
                  min={0}
                  max={100}
                />
              </Field>
              <Field label={"מע״מ (₪)"}>
                <NumberInput
                  value={vatAmount}
                  onChange={(v) => setVatAmount(Math.max(0, Number(v) || 0))}
                  min={0}
                />
              </Field>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <Field label="מטבע">
                <input
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                />
              </Field>
              <Field label="מס׳ הזמנה (אצלכם)">
                <input
                  value={orderId}
                  onChange={(e) => setOrderId(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                  placeholder="אופציונלי"
                />
              </Field>
            </div>
          </Section>

          {/* מסמך (אופציונלי) */}
          <Section title="מסמך (אופציונלי)">
            <label className="flex items-center gap-2 mb-2">
              <input
                type="checkbox"
                checked={createDoc}
                onChange={(e) => setCreateDoc(e.target.checked)}
              />
              <span>יצירת מסמך אוטומטית</span>
            </label>
            <div
              className={`grid gap-2 ${createDoc ? "opacity-100" : "opacity-50 pointer-events-none"}`}
            >
              <Field label="כותרת למסמך (DocHeadline)">
                <input
                  value={docHeadline}
                  onChange={(e) => setDocHeadline(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                />
              </Field>
              <Field label="שם פריט (DocItemName)" required={createDoc}>
                <input
                  value={docItemName}
                  onChange={(e) => setDocItemName(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                />
              </Field>
              <Field label="הערות למסמך (DocComments)">
                <textarea
                  value={docComments}
                  onChange={(e) => setDocComments(e.target.value)}
                  className="w-full h-20 px-2 py-1 border rounded"
                />
              </Field>
              <Field label="שיוך לקוח">
                <select
                  value={clientMode}
                  onChange={(e) => setClientMode(e.target.value as any)}
                  className="w-full h-9 px-2 border rounded"
                >
                  <option value="general">לקוח כללי</option>
                  <option value="autoCreate">יצירת לקוח אוטומטית</option>
                </select>
              </Field>
            </div>
          </Section>

          {/* הגדרות סליקה */}
          <Section title="הגדרות סליקה (ProcessApiRequestV2)">
            <div className="grid grid-cols-2 gap-2">
              <Field label="CreditCardCompanyType (6/7/12)">
                <input
                  value={creditCardCompanyType}
                  onChange={(e) => setCreditCardCompanyType(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                  placeholder="למשל: 6 (UPay) / 7 (Meshulam) / 12 (Yaad Sarig)"
                />
              </Field>
              <Field label="Invoice4U API Key (אם לא מטופל בשרת)">
                <input
                  value={uiApiKey}
                  onChange={(e) => setUiApiKey(e.target.value)}
                  className="w-full h-9 px-2 border rounded"
                  placeholder="ניתן להשאיר ריק אם השרת מוסיף"
                />
              </Field>
            </div>
            <div className="text-xs text-gray-500 mt-1">
              * PaymentsNum=1, ללא הוראת קבע, ללא Bit.
            </div>
          </Section>

          {/* קישורי חזרה */}
          <Section title="קישורי חזרה (אופציונלי)">
            <Field label="ReturnUrl">
              <input
                value={retUrl}
                onChange={(e) => setRetUrl(e.target.value)}
                className="w-full h-9 px-2 border rounded"
                placeholder="https://app.example.com/successPay"
              />
            </Field>
            <Field label="CallBackUrl">
              <input
                value={cbUrl}
                onChange={(e) => setCbUrl(e.target.value)}
                className="w-full h-9 px-2 border rounded"
                placeholder="https://api.example.com/webhooks/invoice4u"
              />
            </Field>
          </Section>
        </div>

        {/* Footer */}
        <div className="px-4 py-3 border-t flex items-center justify-between">
          {error ? (
            <div className="text-red-700 text-sm">שגיאה: {error}</div>
          ) : (
            <div />
          )}
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="h-9 px-3 rounded border hover:bg-gray-50"
            >
              בטל
            </button>
            <button
              onClick={handleSubmit}
              disabled={!isValid || submitting}
              className="h-9 px-3 rounded border bg-blue-50 hover:bg-blue-100 disabled:opacity-50 min-w-[180px]"
            >
              {submitting
                ? "יוצר…"
                : justCreated
                  ? "נוצרה ✓"
                  : "צור בקשת תשלום"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// ==================== UI helpers ====================
function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border rounded-xl p-3 bg-gray-50/50">
      <div className="text-sm font-semibold mb-2 text-gray-700">{title}</div>
      <div className="grid gap-2">{children}</div>
    </div>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <span className="block text-gray-600 mb-1 text-sm">
        {label} {required ? <b className="text-red-600">*</b> : null}
      </span>
      {children}
    </label>
  );
}

function NumberInput({
  value,
  onChange,
  min,
  max,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      step="0.01"
      min={min}
      max={max}
      value={Number.isFinite(value) ? value : 0}
      onChange={(e) => onChange(Number(e.target.value))}
      className="w-full h-9 px-2 border rounded"
    />
  );
}
