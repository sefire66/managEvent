"use client";

import React, { useEffect, useMemo, useState } from "react";

type BusinessType = "EXEMPT" | "LICENSED";
type FeeMode = "included" | "add_on";
type PRStatus = "draft" | "active" | "paid" | "expired" | "canceled";
type PRType = "payment" | "gift";
type SentChannel = "sms" | "email" | "manual" | null;

// ✅ ספקי סליקה נתמכים (תואם סכמה)
type CheckoutProvider = "invoice4u" | "paypal" | "cardcom" | "upay" | "manual";
const ALL_PROVIDERS: CheckoutProvider[] = [
  "invoice4u",
  "paypal",
  "cardcom",
  "upay",
  "manual",
];

const fmtILS = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

export interface CreatePaymentRequestProps {
  userId: string; // ownerUserId
  userName: string;
  userEmail: string;
  onCreated?: (token: string) => void;
}

// טיפוס לתצוגת פרופיל חיוב (הוספנו שדות ספקים)
type BillingProfileUI = {
  _id: string;
  ownerEmail: string;
  businessName: string;
  businessType?: BusinessType;
  vatRate?: number; // באחוזים, רק כש- LICENSED
  taxId?: string;
  isDefault?: boolean;
  lastUsedAt?: string;
  // 🆕
  defaultCheckoutProvider?: CheckoutProvider;
  allowedCheckoutProviders?: CheckoutProvider[];
};

export default function CreatePaymentRequest({
  userId,
  userName,
  userEmail,
  onCreated,
}: CreatePaymentRequestProps) {
  // —— מצב טופס
  const [type, setType] = useState<PRType>("payment");
  const [title, setTitle] = useState<string>(`תשלום מ${userName || userEmail}`);
  const [description, setDescription] = useState<string>("");
  const [imageUrl, setImageUrl] = useState<string>("");
  const [currency, setCurrency] = useState<string>("ILS");

  // כספים
  const [amount, setAmount] = useState<number | "">("");
  const [net, setNet] = useState<number | "">(""); // לפני מע״מ
  const [vatRate, setVatRate] = useState<number>(0); // %
  const vatAmount = useMemo(() => {
    const a = Number(amount);
    if (!Number.isFinite(a) || a <= 0) return 0;
    if (!vatRate) return 0;
    return round2((a * vatRate) / (100 + vatRate));
  }, [amount, vatRate]);

  // gift פתוח
  const [minAmount, setMinAmount] = useState<number | "">("");

  // עמלות (לרוב רלוונטי ל-gift)
  const [feeMode, setFeeMode] = useState<FeeMode>("add_on");
  const [feeFixed, setFeeFixed] = useState<number>(0);
  const [feePercent, setFeePercent] = useState<number>(0);
  const [showFeeBreakdown, setShowFeeBreakdown] = useState<boolean>(true);

  // תוקף/שימושים/סטטוס
  const [usageLimit, setUsageLimit] = useState<number>(1);
  const [expiresAt, setExpiresAt] = useState<string>(""); // ISO-local (input type="datetime-local")
  const [status, setStatus] = useState<PRStatus>("active");

  // פעולות/שליחה
  const [sentChannel, setSentChannel] = useState<SentChannel>(null);

  // מצב מערכת
  const [loadingVat, setLoadingVat] = useState(false);
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // תוצאה לאחר יצירה
  const [token, setToken] = useState<string | null>(null);
  const [shortUrl, setShortUrl] = useState<string | null>(null);

  // —— בחירת פרופיל חיוב
  const [profiles, setProfiles] = useState<BillingProfileUI[]>([]);
  const [selectedProfileId, setSelectedProfileId] = useState<string | "">("");

  // —— 🆕 ספקי סליקה לפי הפרופיל
  const [allowedProviders, setAllowedProviders] =
    useState<CheckoutProvider[]>(ALL_PROVIDERS);
  const [checkoutProvider, setCheckoutProvider] =
    useState<CheckoutProvider>("invoice4u");

  function applyProfile(p?: BillingProfileUI | null) {
    if (!p) return;

    // VAT
    const rate =
      p.businessType === "EXEMPT"
        ? 0
        : Math.max(0, Math.min(100, Number(p.vatRate || 0)));
    setVatRate(rate);

    // Providers
    const list =
      p.allowedCheckoutProviders && p.allowedCheckoutProviders.length > 0
        ? (p.allowedCheckoutProviders as CheckoutProvider[])
        : ALL_PROVIDERS;

    setAllowedProviders(list);

    const defaultProv =
      p.defaultCheckoutProvider && list.includes(p.defaultCheckoutProvider)
        ? p.defaultCheckoutProvider
        : list[0];

    setCheckoutProvider(defaultProv);

    // עדכון נגזרים של amount/net
    if (net !== "" && Number(net) >= 0) {
      handleNetChange(String(net));
    } else if (amount !== "" && Number(amount) >= 0) {
      handleAmountChange(String(amount));
    }
  }

  async function fetchProfiles() {
    setLoadingVat(true);
    setError(null);
    try {
      const url = `/api/billing-profile?list=1`;
      const res = await fetch(url, { cache: "no-store" });
      const data = await res.json();

      if (!res.ok || !Array.isArray(data)) {
        if (res.ok && data && typeof data === "object") {
          setProfiles([data as BillingProfileUI]);
        } else {
          throw new Error(data?.error || "שגיאה בשליפת פרופילי חיוב");
        }
      } else {
        setProfiles(data as BillingProfileUI[]);
      }

      const list: BillingProfileUI[] = Array.isArray(data)
        ? data
        : data
          ? [data]
          : [];

      if (list.length === 0) {
        setSelectedProfileId("");
        setError("לא נמצאו פרופילי חיוב ללקוח זה. יש להגדיר מראש.");
        return;
      }

      if (list.length === 1) {
        setSelectedProfileId(list[0]._id);
        applyProfile(list[0]);
        return;
      }

      // אם יש כמה — נעדיף isDefault, אחרת לפי lastUsedAt
      const byDefault = list.find((p) => p.isDefault);
      if (byDefault) {
        setSelectedProfileId(byDefault._id);
        applyProfile(byDefault);
      } else {
        const sorted = [...list].sort((a, b) => {
          const ta = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
          const tb = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
          return tb - ta;
        });
        setSelectedProfileId(sorted[0]?._id || "");
        applyProfile(sorted[0]);
      }
    } catch (e: any) {
      setError(e.message || "שגיאה בשליפת פרופילי חיוב");
      setProfiles([]);
      setSelectedProfileId("");
      // נפל חיפוש — נחזיר ספקי ברירת מחדל
      setAllowedProviders(ALL_PROVIDERS);
      setCheckoutProvider("invoice4u");
    } finally {
      setLoadingVat(false);
    }
  }

  useEffect(() => {
    fetchProfiles();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userEmail]);

  // —— סנכרון amount<->net (דו-כיווני)
  function handleAmountChange(v: string) {
    const num = v === "" ? "" : Number(v);
    setAmount(num);
    if (num === "") {
      setNet("");
      return;
    }
    if (Number.isFinite(num) && num >= 0) {
      const a = Number(num);
      const netVal = vatRate > 0 ? round2(a / (1 + vatRate / 100)) : a;
      setNet(netVal);
    }
  }

  function handleNetChange(v: string) {
    const num = v === "" ? "" : Number(v);
    setNet(num);
    if (num === "") {
      setAmount("");
      return;
    }
    if (Number.isFinite(num) && num >= 0) {
      const n = Number(num);
      const gross = vatRate > 0 ? round2(n * (1 + vatRate / 100)) : n;
      setAmount(gross);
    }
  }

  function isPaymentValid() {
    const a = Number(amount);
    if (!selectedProfileId) return false; // חייבים לבחור פרופיל
    if (!checkoutProvider) return false; // חייבים ספק סליקה
    if (type === "payment") return Number.isFinite(a) && a > 0;
    const ma = Number(minAmount);
    return (Number.isFinite(a) && a > 0) || (Number.isFinite(ma) && ma > 0);
  }

  // —— יצירה + עדכון מע״מ + פעולות
  async function handleCreate() {
    setCreating(true);
    setError(null);
    setToken(null);
    setShortUrl(null);
    try {
      // 1) POST – יצירה בסיסית (כולל checkoutProvider)
      const body: any = {
        ownerUserId: userId,
        type,
        currency,
        title: title?.trim() || `תשלום מ${userName || userEmail}`,
        description: description?.trim() || undefined,
        imageUrl: imageUrl?.trim() || undefined,
        usageLimit: Math.max(1, Number(usageLimit) || 1),
        expiresAt: expiresAt ? new Date(expiresAt).toISOString() : null,
        status,
        sentChannel,
        checkoutProvider, // ✅ חדש
        amount:
          type === "payment"
            ? Number(amount)
            : Number.isFinite(Number(amount)) && Number(amount) > 0
              ? Number(amount)
              : null,
        minAmount:
          type === "gift"
            ? minAmount === ""
              ? null
              : Number(minAmount)
            : null,
        feeMode: type === "gift" ? feeMode : undefined,
        feeFixed: type === "gift" ? Number(feeFixed || 0) : undefined,
        feePercent: type === "gift" ? Number(feePercent || 0) : undefined,
        showFeeBreakdown: type === "gift" ? showFeeBreakdown : undefined,
        // billingProfileId: selectedProfileId, // כשיהיה נתמך בשרת
      };

      const res = await fetch("/api/payment-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data?.token) {
        throw new Error(data?.error || "יצירת בקשת התשלום נכשלה");
      }

      const t: string = data.token;
      setToken(t);
      setShortUrl(data.shortUrl || `/pay/${encodeURIComponent(t)}`);
      onCreated?.(t);

      // 2) PATCH – קיבוע מע״מ (השרת מסנכרן amount/net/vatAmount)
      const patchPayload: any = {
        vatRate: Number(vatRate) || 0,
        // billingProfileId: selectedProfileId, // אם יתמוך
      };
      if (net !== "" && Number(net) > 0) patchPayload.net = Number(net);
      else if (amount !== "" && Number(amount) > 0)
        patchPayload.amount = Number(amount);

      const pRes = await fetch(
        `/api/payment-requests/${encodeURIComponent(t)}`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(patchPayload),
        }
      );
      const pJson = await pRes.json().catch(() => ({}));
      if (!pRes.ok) {
        console.warn("PATCH vat failed", pJson);
        alert(pJson.error || `Request failed (${res.status})`);
        // if (pJson.code === "MIN_AMOUNT") toast.error(`המינימום הוא ${pJson.min} ₪`);
      }
    } catch (e: any) {
      setError(e.message || "יצירה נכשלה");
    } finally {
      setCreating(false);
    }
  }

  async function handleSendEmail() {
    if (!token) return;
    try {
      const res = await fetch(
        `/api/payment-requests/${encodeURIComponent(token)}/send`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: userEmail,
            recipientName: userName,
          }),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "שליחת המייל נכשלה");
      alert("הקישור נשלח במייל ללקוח ✅");
    } catch (e: any) {
      alert(e.message || "שליחת המייל נכשלה");
    }
  }

  async function copyLink() {
    if (!shortUrl) return;
    const full = shortUrl.startsWith("http")
      ? shortUrl
      : `${window.location.origin}${shortUrl}`;
    await navigator.clipboard.writeText(full);
  }

  // ===== רנדר =====
  return (
    <div
      className="border rounded-lg p-3 bg-gray-50 
      w-full max-w-[600px] mx-auto overflow-y-auto max-h-[50vh]"
      dir="rtl"
    >
      <div className="flex items-center justify-between mb-2">
        <div className="text-sm">
          <div>
            <span className="text-gray-600">שם: </span>
            <b>{userName || "—"}</b>
          </div>
          <div>
            <span className="text-gray-600">אימייל: </span>
            <b dir="ltr">{userEmail}</b>
          </div>
        </div>

        <button
          onClick={fetchProfiles}
          disabled={loadingVat}
          className="border rounded px-3 py-1.5 text-xs hover:bg-gray-100 cursor-pointer"
          title="טען פרופיל/ים לחשבון ובחר"
        >
          {loadingVat ? "טוען פרופילים…" : "טען פרופילים"}
        </button>
      </div>

      {error && (
        <div className="mb-2 bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-xs">
          {error}
        </div>
      )}

      {/* בורר פרופיל חיוב */}
      {profiles.length > 1 && (
        <div className="mb-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">
              פרופיל חיוב (Business Name)
            </span>
            <select
              className="border rounded px-2 py-1.5 text-xs"
              value={selectedProfileId}
              onChange={(e) => {
                const id = e.target.value;
                setSelectedProfileId(id);
                const p = profiles.find((x) => x._id === id);
                applyProfile(p);
              }}
            >
              {profiles.map((p) => (
                <option key={p._id} value={p._id}>
                  {p.businessName}
                  {p.taxId ? ` · ${p.taxId}` : ""}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {profiles.length === 1 && selectedProfileId && (
        <div className="mb-2 text-xs text-gray-600">
          פרופיל חיוב נבחר:{" "}
          <b>
            {profiles[0].businessName}
            {profiles[0].taxId ? ` · ${profiles[0].taxId}` : ""}
          </b>
        </div>
      )}

      {/* —— שדות מרכזיים —— */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">סוג</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={type}
            onChange={(e) => setType(e.target.value as PRType)}
          >
            <option value="payment">תשלום (סכום קבוע)</option>
            <option value="gift">מתנה (פתוח/קבוע)</option>
          </select>
        </label>

        <label className="flex flex-col gap-1 md:col-span-2">
          <span className="text-xs text-gray-600">כותרת</span>
          <input
            className="border rounded px-2 py-1.5 text-xs"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="כותרת שתופיע בדף התשלום"
          />
        </label>
      </div>

      {/* 🆕 בוחר ספק סליקה */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <label className="flex flex-col gap-1 md:col-span-1">
          <span className="text-xs text-gray-600">ספק סליקה</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={checkoutProvider}
            onChange={(e) =>
              setCheckoutProvider(e.target.value as CheckoutProvider)
            }
            disabled={allowedProviders.length <= 1}
            title={
              allowedProviders.length <= 1
                ? "ספק יחיד זמין לפרופיל זה"
                : "בחר ספק סליקה"
            }
          >
            {allowedProviders.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">סכום ברוטו (₪)</span>
          <input
            type="number"
            min={1}
            step="0.01"
            className="border rounded px-2 py-1.5 text-xs"
            value={amount}
            onChange={(e) => handleAmountChange(e.target.value)}
            placeholder="לדוגמה: 120"
            disabled={
              type === "gift" && minAmount !== "" && Number(minAmount) > 0
            }
          />
        </label>

        <label className="flex flex-col gap-1 ">
          <span className="text-xs text-gray-600">מטבע</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
          >
            <option value="ILS">ILS</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">לפני מע״מ (₪)</span>
          <input
            type="number"
            min={0}
            step="0.01"
            className="border rounded px-2 py-1.5 text-xs"
            value={net}
            onChange={(e) => handleNetChange(e.target.value)}
            placeholder="יחושב מסכום ברוטו או להיפך"
            disabled={
              type === "gift" && minAmount !== "" && Number(minAmount) > 0
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">שיעור מע״מ (%)</span>
          <input
            type="number"
            min={0}
            max={100}
            step="0.1"
            className="border rounded px-2 py-1.5 text-xs"
            value={vatRate}
            onChange={(e) => {
              const r = Math.max(0, Math.min(100, Number(e.target.value) || 0));
              setVatRate(r);
              if (net !== "" && Number(net) >= 0) {
                handleNetChange(String(net));
              } else if (amount !== "" && Number(amount) >= 0) {
                handleAmountChange(String(amount));
              }
            }}
          />
        </label>

        <div className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">מע״מ (₪)</span>
          <div className="border rounded px-2 py-1.5 text-xs bg-gray-100">
            {fmtILS.format(vatAmount || 0)}
          </div>
        </div>
      </div>

      {type === "gift" && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-3 mb-2">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">מצב עמלה</span>
            <select
              className="border rounded px-2 py-1.5 text-xs"
              value={feeMode}
              onChange={(e) => setFeeMode(e.target.value as FeeMode)}
            >
              <option value="add_on">עמלה בתוספת</option>
              <option value="included">עמלה כלולה</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">עמלה קבועה (₪)</span>
            <input
              type="number"
              min={0}
              step="0.01"
              className="border rounded px-2 py-1.5 text-xs"
              value={feeFixed}
              onChange={(e) => setFeeFixed(Number(e.target.value) || 0)}
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">עמלה אחוזית (0–1)</span>
            <input
              type="number"
              min={0}
              max={1}
              step="0.01"
              className="border rounded px-2 py-1.5 text-xs"
              value={feePercent}
              onChange={(e) => setFeePercent(Number(e.target.value) || 0)}
            />
          </label>

          <label className="flex items-center gap-2 mt-5">
            <input
              type="checkbox"
              checked={showFeeBreakdown}
              onChange={(e) => setShowFeeBreakdown(e.target.checked)}
            />
            <span className="text-xs text-gray-600">הצג פירוט עמלה</span>
          </label>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">תוקף</span>
          <input
            type="datetime-local"
            className="border rounded px-2 py-1.5 text-xs"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">מס׳ שימושים</span>
          <input
            type="number"
            min={1}
            step={1}
            className="border rounded px-2 py-1.5 text-xs"
            value={usageLimit}
            onChange={(e) =>
              setUsageLimit(Math.max(1, Number(e.target.value) || 1))
            }
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">סטטוס</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={status}
            onChange={(e) => setStatus(e.target.value as PRStatus)}
          >
            <option value="draft">טיוטה</option>
            <option value="active">פעילה</option>
            <option value="paid">שולמה</option>
            <option value="expired">פג תוקף</option>
            <option value="canceled">בוטלה</option>
          </select>
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-2">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">תיאור (אופציונלי)</span>
          <textarea
            className="border rounded px-2 py-1.5 text-xs min-h-[70px]"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="טקסט שיופיע בעמוד התשלום"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">תמונת כותרת (URL)</span>
          <input
            className="border rounded px-2 py-1.5 text-xs"
            value={imageUrl}
            onChange={(e) => setImageUrl(e.target.value)}
            placeholder="https://..."
            dir="ltr"
          />
        </label>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">ערוץ שליחה (לוג)</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={String(sentChannel)}
            onChange={(e) =>
              setSentChannel(
                (e.target.value === "null"
                  ? null
                  : e.target.value) as SentChannel
              )
            }
          >
            <option value="null">—</option>
            <option value="email">email</option>
            <option value="sms">sms</option>
            <option value="manual">manual</option>
          </select>
        </label>
      </div>

      <div className=" ml-auto text-xs text-gray-600 pb-2">
        {amount !== "" ? (
          <>
            <span>
              ברוטו: <b>{fmtILS.format(Number(amount) || 0)}</b>
            </span>
            <span className="mx-2">·</span>
            <span>
              לפני מע״מ:{" "}
              <b>{fmtILS.format((Number(amount) || 0) - (vatAmount || 0))}</b>
            </span>
            <span className="mx-2">·</span>
            <span>
              מע״מ: <b>{fmtILS.format(vatAmount || 0)}</b>
            </span>
          </>
        ) : (
          <span className="text-gray-500">מלא סכום/לפני מע״מ</span>
        )}
      </div>

      {/* ——— פעולות ——— */}
      <div className="flex items-center gap-2">
        <button
          onClick={handleCreate}
          disabled={creating || !isPaymentValid() || !!token}
          className={`rounded px-3 py-1.5 text-xs text-white ${
            creating || !isPaymentValid() || !!token
              ? "bg-gray-400 cursor-not-allowed"
              : "bg-indigo-600 hover:bg-indigo-700"
          }`}
          title={token ? "בקשה כבר נוצרה" : "צור בקשת תשלום"}
        >
          {token ? "נוצר ✓" : creating ? "יוצר…" : "צור בקשת תשלום"}
        </button>

        {token && (
          <>
            <button
              onClick={handleSendEmail}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              שלח מייל
            </button>
            <button
              onClick={copyLink}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              העתק קישור
            </button>
            {shortUrl && (
              <a
                href={shortUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
              >
                פתח קישור
              </a>
            )}
          </>
        )}
      </div>
    </div>
  );
}
