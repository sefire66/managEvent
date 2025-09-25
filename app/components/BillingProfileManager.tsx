"use client";

import { useEffect, useState } from "react";
import { BillingProfile } from "../types/types";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "../components/ui/dialog";

// 👇 תואם בדיוק ל-CHECKOUT_PROVIDERS בסכמה
type CheckoutProvider = "invoice4u" | "paypal" | "cardcom" | "upay" | "manual";

// רשימת ספקים מערכתית (fallback אם אין allowed בפרופיל)
const SYSTEM_PROVIDERS: CheckoutProvider[] = [
  "invoice4u",
  "paypal",
  "cardcom",
  "upay",
  "manual",
];

// ברירת מחדל לפרופיל חדש (UI בלבד)
const emptyProfile: Partial<BillingProfile> & {
  vatEffectiveFrom?: string;
  defaultCheckoutProvider?: CheckoutProvider;
  allowedCheckoutProviders?: CheckoutProvider[];
} = {
  legalName: "",
  businessName: "",
  businessId: "",
  businessType: "EXEMPT",
  vatRate: 0,
  address: "",
  phone: "",
  note: "",
  minPayment: 1,
  defaultCheckoutProvider: "invoice4u",
  allowedCheckoutProviders: SYSTEM_PROVIDERS, // כדי שהבורר יעבוד גם ללא נתונים מהשרת
  vatEffectiveFrom: new Date().toISOString().split("T")[0],
};

type Props = {
  session: any; // מגיע מ-AdminDashboardClient
};

export default function BillingProfileManager({ session }: Props) {
  const [isOpen, setIsOpen] = useState(false);
  const [profile, setProfile] = useState<BillingProfile | null>(null);
  const [loading, setLoading] = useState(false);

  const [showEdit, setShowEdit] = useState(false);
  const [form, setForm] = useState<
    Partial<BillingProfile> & {
      vatEffectiveFrom?: string;
      defaultCheckoutProvider?: CheckoutProvider;
      allowedCheckoutProviders?: CheckoutProvider[];
    }
  >(emptyProfile);

  // רשימת ספקים להצגה בבורר (נגזרת מהפרופיל)
  const [providerOptions, setProviderOptions] =
    useState<CheckoutProvider[]>(SYSTEM_PROVIDERS);

  useEffect(() => {
    fetchProfile();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchProfile = async () => {
    setLoading(true);
    try {
      const res = await fetch(
        `/api/billing-profile?email=${encodeURIComponent(session.user?.email)}`,
        { cache: "no-store" }
      );
      if (res.ok) {
        const data = await res.json();

        // נחלץ allowed/default בצורה בטוחה
        const allowed: CheckoutProvider[] =
          (data?.allowedCheckoutProviders as CheckoutProvider[]) &&
          Array.isArray(data.allowedCheckoutProviders) &&
          data.allowedCheckoutProviders.length > 0
            ? (data.allowedCheckoutProviders as CheckoutProvider[])
            : SYSTEM_PROVIDERS;

        let defProv: CheckoutProvider =
          (data?.defaultCheckoutProvider as CheckoutProvider) || "invoice4u";

        // אם הדיפולט לא קיים ב-allowed — נבחר ראשון זמין
        if (!allowed.includes(defProv)) {
          defProv = allowed[0];
        }

        setProfile(data);
        setProviderOptions(allowed);

        setForm({
          ...data,
          defaultCheckoutProvider: defProv,
          allowedCheckoutProviders: allowed,
          vatEffectiveFrom:
            (data as any)?.vatEffectiveFrom ||
            new Date().toISOString().split("T")[0],
        });
      } else {
        setProfile(null);
        setProviderOptions(SYSTEM_PROVIDERS);
        setForm(emptyProfile);
      }
    } catch (e) {
      console.error(e);
      setProfile(null);
      setProviderOptions(SYSTEM_PROVIDERS);
      setForm(emptyProfile);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // וידוא אחרון בצד לקוח: הבחירה חוקית
      const allowed = form.allowedCheckoutProviders?.length
        ? form.allowedCheckoutProviders
        : providerOptions;
      let toSaveDefault =
        (form.defaultCheckoutProvider as CheckoutProvider) || "invoice4u";
      if (!allowed.includes(toSaveDefault)) {
        toSaveDefault = allowed[0]!;
      }

      const res = await fetch("/api/billing-profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...form,
          defaultCheckoutProvider: toSaveDefault,
          ownerEmail: session.user?.email, // תמיד מצרפים אימייל
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data?.error || "שמירה נכשלה");

      // נעדכן סטייטים מקומיים
      const savedAllowed: CheckoutProvider[] =
        (data?.allowedCheckoutProviders as CheckoutProvider[]) &&
        Array.isArray(data.allowedCheckoutProviders) &&
        data.allowedCheckoutProviders.length > 0
          ? (data.allowedCheckoutProviders as CheckoutProvider[])
          : SYSTEM_PROVIDERS;

      const savedDefault: CheckoutProvider =
        (data?.defaultCheckoutProvider as CheckoutProvider) ||
        toSaveDefault ||
        "invoice4u";

      setProfile(data);
      setProviderOptions(savedAllowed);
      setForm({
        ...data,
        defaultCheckoutProvider: savedDefault,
        allowedCheckoutProviders: savedAllowed,
        vatEffectiveFrom:
          (data as any)?.vatEffectiveFrom ||
          (form.vatEffectiveFrom ?? new Date().toISOString().split("T")[0]),
      });
      setShowEdit(false);
    } catch (e) {
      console.error(e);
      alert("שמירה נכשלה");
    }
  };

  return (
    <div className="bg-white rounded shadow" dir="rtl">
      {/* כותרת אקורדיון */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-3 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-xl transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-sm font-semibold">פרופיל עסקי (Billing)</span>
        </div>
      </button>

      {/* גוף האקורדיון */}
      {isOpen && (
        <div className="p-4 text-sm text-gray-700 space-y-2">
          {loading ? (
            <p className="text-gray-500">טוען פרטי פרופיל…</p>
          ) : profile ? (
            <>
              <p>
                <strong>שם עסקי/מותג:</strong> {profile.businessName}
              </p>
              <p>
                <strong>שם רשמי:</strong> {profile.legalName}
              </p>
              <p>
                <strong>מספר עוסק/ת״ז/ח.פ.:</strong> {profile.businessId}
              </p>
              <p>
                <strong>סוג עוסק:</strong>{" "}
                {profile.businessType === "EXEMPT" ? "עוסק פטור" : "עוסק מורשה"}
              </p>
              <p>
                <strong>שיעור מע״מ:</strong> {profile.vatRate}%
              </p>
              <p>
                <strong>ספק סליקה דיפולטי:</strong>{" "}
                {((profile as any)
                  .defaultCheckoutProvider as CheckoutProvider) ?? "invoice4u"}
              </p>
              {(profile as any)?.allowedCheckoutProviders?.length ? (
                <p>
                  <strong>ספקים מותרים:</strong>{" "}
                  {((profile as any).allowedCheckoutProviders as string[]).join(
                    ", "
                  )}
                </p>
              ) : (
                <p>
                  <strong>ספקים מותרים:</strong> כל הספקים הפעילים (ברירת מחדל)
                </p>
              )}
              {/* ============================= */}
              {/* ============================= */}
              <p>
                <strong>תשלום מינימום:</strong> {profile.minPayment} ₪
              </p>
              {/* ===================================== */}
              {profile.note && (
                <p>
                  <strong>הערה:</strong> {profile.note}
                </p>
              )}
            </>
          ) : (
            <p className="text-red-500">לא נמצא פרופיל עסקי. צור חדש:</p>
          )}

          <button
            onClick={() => setShowEdit(true)}
            className="mt-4 px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs cursor-pointer"
          >
            {profile ? "ערוך פרופיל" : "צור פרופיל חדש"}
          </button>
        </div>
      )}

      {/* מודל עריכה */}
      <Dialog open={showEdit} onOpenChange={setShowEdit}>
        <DialogContent dir="rtl">
          <DialogHeader>
            <DialogTitle>
              {profile ? "עריכת פרופיל עסקי" : "יצירת פרופיל עסקי חדש"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {/* שורה 1: שם עסק/מותג */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                שם עסקי/מותג
              </label>
              <input
                className="w-full border rounded p-2"
                placeholder="לדוגמה: ניהול אירועים"
                value={form.businessName || ""}
                onChange={(e) =>
                  setForm((f) => ({ ...f, businessName: e.target.value }))
                }
              />
            </div>

            {/* שורה 2: שם רשמי + ת״ז/ח.פ. */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  שם רשמי (כפי שנרשם במע״מ)
                </label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="לדוגמה: ישראל ישראלי"
                  value={form.legalName || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, legalName: e.target.value }))
                  }
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  ת״ז / ח.פ. (מספר עוסק)
                </label>
                <input
                  className="w-full border rounded p-2"
                  placeholder="לדוגמה: 123456789"
                  value={form.businessId || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, businessId: e.target.value }))
                  }
                />
              </div>
            </div>

            {/* שורה 3: סוג עוסק + שיעור מע״מ */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  סוג עוסק
                </label>
                <select
                  className="w-full border rounded p-2"
                  value={form.businessType || "EXEMPT"}
                  onChange={(e) =>
                    setForm((f) => {
                      const newType = e.target.value as "EXEMPT" | "LICENSED";
                      return {
                        ...f,
                        businessType: newType,
                        vatRate: newType === "EXEMPT" ? 0 : f.vatRate,
                      };
                    })
                  }
                >
                  <option value="EXEMPT">עוסק פטור</option>
                  <option value="LICENSED">עוסק מורשה</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  שיעור מע״מ (%)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.1}
                  className="w-full border rounded p-2"
                  placeholder="לדוגמה: 18"
                  value={form.vatRate ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vatRate: Number(e.target.value) }))
                  }
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  ערכים אפשריים: 0–100. לעוסק פטור השאר 0.
                </p>
              </div>
            </div>

            {/* שורה 4: ספק סליקה דיפולטי (מתוך רשימת ספקים מותרת) */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                ספק סליקה דיפולטי
              </label>
              <select
                className="w-full border rounded p-2"
                value={form.defaultCheckoutProvider || providerOptions[0]}
                onChange={(e) => {
                  const next = e.target.value as CheckoutProvider;
                  // וידוא שהבחירה קיימת באפשרויות
                  if (!providerOptions.includes(next)) return;
                  setForm((f) => ({
                    ...f,
                    defaultCheckoutProvider: next,
                  }));
                }}
              >
                {providerOptions.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
              <p className="text-[11px] text-gray-500 mt-1">
                בקשות תשלום חדשות יירשו את הספק הזה כברירת־מחדל (ניתן לעדכן
                ידנית בבקשה). אפשרויות מוצגות לפי{" "}
                <code>allowedCheckoutProviders</code> או ברירת־מחדל מערכתית.
              </p>
            </div>

            {/* שורה 5: תחולת מע״מ + הערות */}
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  תחולת מע״מ מתאריך
                </label>
                <input
                  type="date"
                  className="w-full border rounded p-2"
                  value={
                    form.vatEffectiveFrom ||
                    new Date().toISOString().split("T")[0]
                  }
                  onChange={(e) =>
                    setForm((f) => ({ ...f, vatEffectiveFrom: e.target.value }))
                  }
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  תשלום מינימום (₪)
                </label>
                <input
                  type="number"
                  min={0}
                  max={100}
                  step={0.5}
                  className="w-full border rounded p-2"
                  placeholder="לדוגמה: 20"
                  value={form.minPayment ?? 0}
                  onChange={(e) =>
                    setForm((f) => ({
                      ...f,
                      minPayment: Number(e.target.value),
                    }))
                  }
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  מינמום לתשלום .
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">
                  הערות
                </label>
                <textarea
                  className="w-full border rounded p-2"
                  placeholder="הערות לגבי הפרופיל..."
                  value={form.note || ""}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, note: e.target.value }))
                  }
                />
              </div>
            </div>
          </div>

          <DialogFooter>
            <button
              onClick={handleSave}
              className="px-3 py-1.5 rounded bg-blue-600 text-white hover:bg-blue-700 text-xs cursor-pointer"
            >
              שמור
            </button>
            <button
              onClick={() => setShowEdit(false)}
              className="px-3 py-1.5 rounded border text-xs cursor-pointer"
            >
              בטל
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
