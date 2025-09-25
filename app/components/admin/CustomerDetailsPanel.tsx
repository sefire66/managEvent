// app/components/admin/customer/CustomerDetailsPanel.tsx
"use client";

import React, { useMemo, useState } from "react";
import type { User } from "@/app/types/types";

type Props = {
  user: User;
  onSaved: (u: User) => void;
  onClose?: () => void; // אופציונלי - אם רוצים כפתור "סגור" בתוך הפאנל
  showHeader?: boolean; // ברירת מחדל true: מציג שם+אימייל בראש
};

function isValidILMobile(raw?: string) {
  if (!raw) return true;
  return /^05\d{8}$/.test(raw);
}

export default function CustomerDetailsPanel({
  user,
  onSaved,
  onClose,
  showHeader = true,
}: Props) {
  const [form, setForm] = useState<Partial<User>>({
    name: user.name,
    email: user.email,
    phone: (user as any).phone,
    role: user.role,
    subscriptionType: user.subscriptionType,
    smsBalance: user.smsBalance,
    smsUsed: user.smsUsed,
    isActive: user.isActive,
    note: (user as any).note ?? "",
  });

  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const phoneValid = isValidILMobile((form as any).phone);

  // חישוב דלתא לשמירה (רק מה שהשתנה)
  const diff = useMemo(() => {
    const d: Record<string, any> = {};
    (
      [
        "name",
        "email",
        "phone",
        "role",
        "subscriptionType",
        "smsBalance",
        "smsUsed",
        "isActive",
        "note",
      ] as const
    ).forEach((k) => {
      const nv = (form as any)[k];
      const ov = (user as any)[k];
      if (nv !== ov && nv !== undefined) d[k] = nv;
    });
    return d;
  }, [form, user]);

  const isDirty = Object.keys(diff).length > 0;

  async function handleSave() {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/users/${user._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(diff),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.error || "שמירה נכשלה");
      onSaved(data as User);
    } catch (e: any) {
      setError(e?.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="flex flex-col gap-3 text-sm" dir="rtl">
      {/* כותרת: שם + אימייל תמיד בראש */}
      {showHeader && (
        <div className="border rounded p-3 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-base font-semibold">
                {form.name || user.name || "—"}
              </div>
              <div className="text-xs text-gray-600" dir="ltr">
                {form.email || user.email}
              </div>
            </div>
            {onClose && (
              <button
                onClick={onClose}
                className="text-xs text-gray-600 hover:text-gray-800 border rounded px-2 py-1 cursor-pointer"
                title="סגור"
              >
                ✕ סגור
              </button>
            )}
          </div>
        </div>
      )}

      {/* שגיאה כללית */}
      {error && (
        <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-xs">
          {error}
        </div>
      )}

      {/* פרטים אישיים */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">שם מלא</span>
          <input
            className="border rounded px-2 py-1.5 text-xs"
            value={form.name ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">אימייל</span>
          <input
            className="border rounded px-2 py-1.5 text-xs"
            value={form.email ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))}
            dir="ltr"
          />
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">
            טלפון{" "}
            <span
              className="text-gray-400 cursor-help"
              title="פורמט: 05XXXXXXXX (10 ספרות, לדוגמה 0521234567)"
            >
              ℹ️
            </span>
          </span>
          <input
            className={`border rounded px-2 py-1.5 text-xs ${
              phoneValid ? "" : "border-red-500"
            }`}
            value={(form as any).phone ?? ""}
            onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))}
            dir="ltr"
            placeholder="05x-xxxxxxx"
            title="פורמט: 05XXXXXXXX (10 ספרות)"
          />
          {!phoneValid && (
            <span className="text-[11px] text-red-600">
              מספר הטלפון לא תקין — יש להזין מובייל ישראלי בפורמט 05XXXXXXXX
            </span>
          )}
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">פעיל?</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={String(form.isActive)}
            onChange={(e) =>
              setForm((f) => ({ ...f, isActive: e.target.value === "true" }))
            }
          >
            <option value="true">✔️ פעיל</option>
            <option value="false">❌ לא פעיל</option>
          </select>
        </label>
      </div>

      {/* הרשאות וחבילה */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">תפקיד (role)</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={form.role ?? "client"}
            onChange={(e) => setForm((f) => ({ ...f, role: e.target.value }))}
          >
            <option value="client">client</option>
            <option value="admin">admin</option>
            <option value="super-admin">super-admin</option>
          </select>
        </label>

        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">חבילה</span>
          <select
            className="border rounded px-2 py-1.5 text-xs"
            value={form.subscriptionType ?? "free"}
            onChange={(e) =>
              setForm((f) => ({
                ...f,
                subscriptionType: e.target.value as User["subscriptionType"],
              }))
            }
          >
            <option value="free">free</option>
            <option value="basic">basic</option>
            <option value="premium">premium</option>
            <option value="enterprise">enterprise</option>
          </select>
        </label>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">יתרת SMS</span>
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1.5 text-xs"
              value={form.smsBalance ?? 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, smsBalance: Number(e.target.value) }))
              }
            />
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-xs text-gray-600">נשלחו</span>
            <input
              type="number"
              min={0}
              className="border rounded px-2 py-1.5 text-xs"
              value={form.smsUsed ?? 0}
              onChange={(e) =>
                setForm((f) => ({ ...f, smsUsed: Number(e.target.value) }))
              }
            />
          </label>
        </div>
      </div>

      {/* הערת אדמין */}
      <div className="grid grid-cols-1 gap-3">
        <label className="flex flex-col gap-1">
          <span className="text-xs text-gray-600">Note (הערת אדמין)</span>
          <textarea
            className="border rounded px-2 py-1.5 text-xs min-h-[80px]"
            value={((form as any).note ?? "") as string}
            onChange={(e) => setForm((f) => ({ ...f, note: e.target.value }))}
            placeholder="הערה פנימית על המשתמש (נראית רק לאדמין)"
          />
        </label>
      </div>

      {/* פוטר פעולות */}
      <div className="flex items-center justify-between border-t pt-3">
        <div className="text-xs text-gray-500">
          {isDirty ? "יש שינויים שלא נשמרו" : "אין שינויים"}
        </div>
        <div className="flex items-center gap-2">
          {onClose && (
            <button
              onClick={onClose}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              ביטול
            </button>
          )}
          <button
            onClick={handleSave}
            disabled={!isDirty || saving || !phoneValid}
            className={`rounded px-3 py-1.5 text-xs text-white ${
              !isDirty || saving || !phoneValid
                ? "bg-gray-400"
                : "bg-blue-600 hover:bg-blue-700"
            }`}
            title={!phoneValid ? "מספר טלפון לא תקין" : undefined}
          >
            {saving ? "שומר…" : "שמירה"}
          </button>
        </div>
      </div>
    </div>
  );
}
