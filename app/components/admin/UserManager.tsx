"use client";

import React, { useMemo, useState } from "react";
import { User } from "../../types/types";

/* === קומפוננטות בקשות תשלום === */
import Invoice4UPaymentRequestCreate from "@/app/components/admin/invoice4u/Invoice4UPaymentRequestCreate";
import UserPaymentRequestsList from "./UserPaymentRequestsList";
import CustomerDetailsPanel from "@/app/components/admin/CustomerDetailsPanel";

// אם יש לך קומפוננטת עריכה קיימת, בטל הערה ושנה נתיב בהתאם:
// import PaymentRequestEditDialog from "./payment-requests/PaymentRequestEditDialog";

/* === טיפוסים עבור מיון/סינון === */
type SortKey =
  | "name"
  | "email"
  | "role"
  | "subscriptionType"
  | "smsBalance"
  | "smsUsed"
  | "isActive"
  | "lastLogin"
  | "paymentsTotal"
  | "note";
type SortDir = "asc" | "desc";
type ActiveFilter = "all" | "active" | "inactive";

/* === עזר להשוואות === */
function parseDateSafe(s?: string | number | Date | null) {
  if (!s) return null;
  const d = new Date(s);
  return isNaN(d.getTime()) ? null : d;
}

function cmpRaw(a: any, b: any, dir: SortDir) {
  const av =
    a instanceof Date
      ? a.getTime()
      : typeof a === "string"
        ? a.toLowerCase()
        : typeof a === "boolean"
          ? a
            ? 1
            : 0
          : (a ?? "");
  const bv =
    b instanceof Date
      ? b.getTime()
      : typeof b === "string"
        ? b.toLowerCase()
        : typeof b === "boolean"
          ? b
            ? 1
            : 0
          : (b ?? "");

  if (av < bv) return dir === "asc" ? -1 : 1;
  if (av > bv) return dir === "asc" ? 1 : -1;
  return 0;
}

const ils = new Intl.NumberFormat("he-IL", {
  style: "currency",
  currency: "ILS",
  maximumFractionDigits: 2,
});

/* === רכיב ראשי: UserManager === */
export default function UserManager({
  users,
  setUsers,
  fetchUsers,
}: {
  users: User[];
  setUsers: React.Dispatch<React.SetStateAction<User[]>>;
  fetchUsers: () => void;
}) {
  const [isOpen, setIsOpen] = useState<boolean>(false);

  /* סינון */
  const [query, setQuery] = useState("");
  const [roleFilter, setRoleFilter] = useState<
    "all" | "client" | "admin" | "super-admin"
  >("all");
  const [activeFilter, setActiveFilter] = useState<ActiveFilter>("all");

  /* מיון */
  const [sortKey, setSortKey] = useState<SortKey>("lastLogin");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  /* דיאלוג עריכה */
  const [editingUser, setEditingUser] = useState<User | null>(null);

  /* לוגיקה: סינון + מיון */
  const filteredSorted = useMemo(() => {
    let list = users.slice();

    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((u) => {
        const name = (u.name || "").toLowerCase();
        const email = (u.email || "").toLowerCase();
        return name.includes(q) || email.includes(q);
      });
    }

    if (roleFilter !== "all") {
      list = list.filter((u) => (u.role || "").toLowerCase() === roleFilter);
    }

    if (activeFilter !== "all") {
      const shouldBeActive = activeFilter === "active";
      list = list.filter((u) => !!u.isActive === shouldBeActive);
    }

    list.sort((a, b) => {
      switch (sortKey) {
        case "name":
          return cmpRaw(a.name, b.name, sortDir);
        case "email":
          return cmpRaw(a.email, b.email, sortDir);
        case "role":
          return cmpRaw(a.role, b.role, sortDir);
        case "subscriptionType":
          return cmpRaw(a.subscriptionType, b.subscriptionType, sortDir);
        case "smsBalance":
          return cmpRaw(a.smsBalance, b.smsBalance, sortDir);
        case "smsUsed":
          return cmpRaw(a.smsUsed, b.smsUsed, sortDir);
        case "isActive":
          return cmpRaw(a.isActive, b.isActive, sortDir);
        case "paymentsTotal":
          return cmpRaw(
            (a as any).paymentsTotal ?? 0,
            (b as any).paymentsTotal ?? 0,
            sortDir
          );
        case "note":
          return cmpRaw((a as any).note ?? "", (b as any).note ?? "", sortDir);
        case "lastLogin":
        default:
          return cmpRaw(
            parseDateSafe(a.lastLogin),
            parseDateSafe(b.lastLogin),
            sortDir
          );
      }
    });

    return list;
  }, [users, query, roleFilter, activeFilter, sortKey, sortDir]);

  return (
    <div className="bg-white rounded shadow text-sm" dir="rtl">
      {/* כותרת אקורדיון */}
      <button
        onClick={() => setIsOpen((o) => !o)}
        className="w-full border-b p-4 text-right flex items-center justify-between hover:bg-gray-50 transition cursor-pointer"
        title="פתח/סגור ניהול משתמשים"
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          <span
            className={`text-lg transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
          >
            {isOpen ? "−" : "+"}
          </span>
          <span className="text-base font-semibold">ניהול משתמשים</span>
          <span className="text-xs text-gray-600">
            ({filteredSorted.length} מתוך {users.length})
          </span>
        </div>
      </button>

      {/* גוף האקורדיון */}
      {isOpen && (
        <div className="p-6">
          {/* סרגל סינון/מיון */}
          <div className="mb-2 p-2 border rounded bg-gray-50">
            <div className="flex flex-wrap md:flex-nowrap items-center gap-2">
              <input
                aria-label="חיפוש (שם/אימייל)"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-8 text-[12px] px-2 border rounded w-48"
                placeholder="חיפוש: שם / אימייל"
              />

              <select
                aria-label="סינון לפי תפקיד"
                value={roleFilter}
                onChange={(e) =>
                  setRoleFilter(
                    e.target.value as "all" | "client" | "admin" | "super-admin"
                  )
                }
                className="h-8 text-[12px] px-2 border rounded w-32"
                title="סנן לפי תפקיד"
              >
                <option value="all">תפקיד: הכל</option>
                <option value="client">client</option>
                <option value="admin">admin</option>
                <option value="super-admin">super-admin</option>
              </select>

              <select
                aria-label="סינון לפי סטטוס"
                value={activeFilter}
                onChange={(e) =>
                  setActiveFilter(e.target.value as ActiveFilter)
                }
                className="h-8 text-[12px] px-2 border rounded w-28"
                title="סנן לפי סטטוס"
              >
                <option value="all">סטטוס: הכל</option>
                <option value="active">פעילים</option>
                <option value="inactive">לא פעילים</option>
              </select>

              <select
                aria-label="מיון לפי"
                value={sortKey}
                onChange={(e) => setSortKey(e.target.value as SortKey)}
                className="h-8 text-[12px] px-2 border rounded w-44"
                title="מיין לפי"
              >
                <option value="lastLogin">כניסה אחרונה</option>
                <option value="name">שם</option>
                <option value="email">אימייל</option>
                <option value="role">role</option>
                <option value="subscriptionType">חבילה</option>
                <option value="smsBalance">יתרת SMS</option>
                <option value="smsUsed">SMS שנשלחו</option>
                <option value="isActive">פעיל?</option>
                <option value="paymentsTotal">סה״כ ששילם (₪)</option>
                <option value="note">Note</option>
              </select>

              <button
                className="h-8 text-[12px] px-2 border rounded cursor-pointer"
                onClick={() => setSortDir(sortDir === "asc" ? "desc" : "asc")}
                title="הפוך כיוון מיון"
              >
                {sortDir === "asc" ? "⬆️" : "⬇️"}
              </button>

              <span className="text-[12px] text-gray-600">
                נמצא/ו <b>{filteredSorted.length}</b> (מתוך {users.length})
              </span>
            </div>
          </div>

          {/* טבלה */}
          <div className="max-h-[60vh] overflow-y-auto text-xs">
            <table className="w-full border">
              <thead>
                <tr className="bg-gray-100">
                  <ThSort
                    label="שם"
                    sortBy="name"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="אימייל"
                    sortBy="email"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="role"
                    sortBy="role"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="חבילה"
                    sortBy="subscriptionType"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="יתרת SMS"
                    sortBy="smsBalance"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="SMS שנשלחו"
                    sortBy="smsUsed"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="סה״כ ששילם (₪)"
                    sortBy="paymentsTotal"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="Note"
                    sortBy="note"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="פעיל?"
                    sortBy="isActive"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                  <ThSort
                    label="כניסה אחרונה"
                    sortBy="lastLogin"
                    sortKey={sortKey}
                    sortDir={sortDir}
                    onToggle={(k) => {
                      if (sortKey === k) {
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      } else {
                        setSortKey(k);
                        setSortDir("asc");
                      }
                    }}
                  />
                </tr>
              </thead>

              <tbody>
                {filteredSorted.map((user) => (
                  <tr
                    key={user._id}
                    className="text-right hover:bg-gray-50 cursor-pointer"
                    onClick={() => setEditingUser(user)}
                  >
                    <td className="border p-1.5">{user.name}</td>
                    <td className="border p-1.5">{user.email}</td>
                    <td className="border p-1.5">{user.role}</td>
                    <td className="border p-1.5">{user.subscriptionType}</td>
                    <td className="border p-1.5">{user.smsBalance ?? 0}</td>
                    <td className="border p-1.5">{user.smsUsed ?? 0}</td>
                    <td className="border p-1.5">
                      {ils.format(((user as any).paymentsTotal ?? 0) as number)}
                    </td>
                    <td className="border p-1.5">
                      {(((user as any).note ?? "") as string).length > 80
                        ? `${(((user as any).note ?? "") as string).slice(0, 77)}…`
                        : (((user as any).note ?? "") as string) || "—"}
                    </td>
                    <td className="border p-1.5">
                      {user.isActive ? "✔️ פעיל" : "❌ לא פעיל"}
                    </td>
                    <td className="border p-1.5">
                      {user.lastLogin
                        ? new Date(user.lastLogin).toLocaleString("he-IL")
                        : "לא נכנס עדיין"}
                    </td>
                  </tr>
                ))}

                {filteredSorted.length === 0 && (
                  <tr>
                    <td colSpan={10} className="p-4 text-center text-gray-500">
                      אין משתמשים תואמים לסינון הנוכחי.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* רענון נתונים */}
          <div className="mt-3">
            <button
              onClick={fetchUsers}
              className="bg-white border rounded px-2 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              רענן רשימה
            </button>
          </div>
        </div>
      )}

      {/* דיאלוג עריכה */}
      {editingUser && (
        <EditUserDialog
          user={editingUser}
          onClose={() => setEditingUser(null)}
          onSaved={(updated) => {
            setUsers((prev) =>
              prev.map((u) => (u._id === updated._id ? updated : u))
            );
          }}
        />
      )}
    </div>
  );
}

/* === כותרת עמודה ממיינת === */
function ThSort({
  label,
  sortBy,
  sortKey,
  sortDir,
  onToggle,
}: {
  label: string;
  sortBy: SortKey;
  sortKey: SortKey;
  sortDir: SortDir;
  onToggle: (k: SortKey) => void;
}) {
  const active = sortKey === sortBy;
  return (
    <th className="border p-0">
      <button
        className={`w-full text-right px-2 py-1.5 flex items-center justify-between ${
          active ? "bg-gray-100 font-semibold" : "bg-gray-100"
        } cursor-pointer`}
        onClick={() => onToggle(sortBy)}
        title="לחץ למיון (החלפה בין עולה/יורד)"
      >
        <span>{label}</span>
        <span className="text-xs opacity-70">
          {active ? (sortDir === "asc" ? "⬆️" : "⬇️") : "↕️"}
        </span>
      </button>
    </th>
  );
}

/* === דיאלוג עריכת משתמש === */
function EditUserDialog({
  user,
  onClose,
  onSaved,
}: {
  user: User;
  onClose: () => void;
  onSaved: (u: User) => void;
}) {
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

  // אימות אימייל / איפוס סיסמה (קיים)
  const [resendLoading, setResendLoading] = useState(false);
  const [resendMsg, setResendMsg] = useState<string | null>(null);
  const [resendErr, setResendErr] = useState<string | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetMsg, setResetMsg] = useState<string | null>(null);
  const [resetErr, setResetErr] = useState<string | null>(null);

  // ← חדש: פאנל בקשות תשלום נפרד
  const [listRefresh, setListRefresh] = useState(0);
  const [editPrToken, setEditPrToken] = useState<string | null>(null);
  type CustomerView = "details" | "create" | "list";
  const [view, setView] = useState<CustomerView>("details");

  function isValidILMobile(raw?: string) {
    if (!raw) return true;
    return /^05\d{8}$/.test(raw);
  }
  const phoneValid = isValidILMobile((form as any).phone);

  // diff לשמירה
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
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "שמירה נכשלה");
      }
      const updated = (await res.json()) as User;
      onSaved(updated);
    } catch (e: any) {
      setError(e.message || "שמירה נכשלה");
    } finally {
      setSaving(false);
    }
  }

  async function handleResendVerification() {
    setResendLoading(true);
    setResendMsg(null);
    setResendErr(null);
    try {
      const res = await fetch(`/api/users/${user._id}/resend-verification`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שליחה נכשלה");
      setResendMsg("נשלח מייל אימות, והמשתמש סומן כלא מאומת.");
    } catch (e: any) {
      setResendErr(e.message || "שליחה נכשלה");
    } finally {
      setResendLoading(false);
    }
  }

  async function handleSendPasswordReset() {
    setResetLoading(true);
    setResetMsg(null);
    setResetErr(null);
    try {
      const res = await fetch(`/api/users/${user._id}/send-password-reset`, {
        method: "POST",
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || "שליחה נכשלה");
      setResetMsg("נשלח קישור איפוס סיסמה למייל של המשתמש.");
    } catch (e: any) {
      setResetErr(e.message || "שליחה נכשלה");
    } finally {
      setResetLoading(false);
    }
  }

  function openPaymentRequestEditDialog(token: string) {
    setEditPrToken(token);
  }

  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center p-4 "
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      {/* רקע שקוף */}
      <div className="absolute inset-0 bg-black/30" />

      {/* כרטיס הדיאלוג */}
      <div
        className="relative bg-white rounded-xl shadow-xl w-full max-w-4xl text-sm"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="border-b px-4 py-3">
          <div className="flex items-center justify-between">
            <div className="flex flex-col">
              <div className="text-base font-semibold">{user.name || "—"}</div>
              <div className="text-xs text-gray-600" dir="ltr">
                {user.email}
              </div>
            </div>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 cursor-pointer"
              title="סגור"
            >
              ✕
            </button>
          </div>

          {/* כפתורי ניווט בין פאנלים */}
          <div className="mt-3 flex items-center gap-2 ">
            <button
              onClick={() => setView("details")}
              className={`border rounded px-3 py-1.5 text-xs cursor-pointer ${
                view === "details" ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              פרטי הלקוח
            </button>
            <button
              onClick={() => setView("create")}
              className={`border rounded px-3 py-1.5 text-xs cursor-pointer ${
                view === "create" ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              בקשת תשלום חדשה
            </button>
            <button
              onClick={() => setView("list")}
              className={`border rounded px-3 py-1.5 text-xs cursor-pointer ${
                view === "list" ? "bg-gray-100" : "hover:bg-gray-50"
              }`}
            >
              רשימת בקשות תשלום
            </button>
          </div>
        </div>

        <div className="p-4 space-y-4">
          {error && (
            <div className="bg-red-50 text-red-700 border border-red-200 rounded px-3 py-2 text-xs">
              {error}
            </div>
          )}

          {view === "details" && (
            <CustomerDetailsPanel
              user={user}
              onSaved={(updated) => {
                onSaved(updated);
                // רענון שם/אימייל ב־Header אם צריך
              }}
            />
          )}

          {view === "create" && (
            <div className="text-sm text-gray-600 ">
              {/* יצירת בקשת תשלום דרך Invoice4U */}
              <Invoice4UPaymentRequestCreate
                userId={user._id}
                userName={user.name}
                userEmail={user.email}
                userPhone={(user as any)?.phone || ""}
                onClose={() => setView("details")} // ← חשוב: מאפשר לסגור את המסך
                onCreated={(token?: string | null) => {
                  // רענון רשימת הבקשות של המשתמש והחזרה לרשימה (אם תרצה)
                  setListRefresh((n) => n + 1);
                  setView("list");
                  setEditPrToken(token ?? null);
                }}
                defaultCreditCardCompanyType="7" // meshulam
                // defaultCreditCardCompanyType="6" // Upay
              />
            </div>
          )}

          {view === "list" && (
            <div className="text-sm text-gray-600">
              {/* רשימת בקשות תשלום */}
              <UserPaymentRequestsList
                ownerUserId={user._id}
                refreshKey={listRefresh}
                onOpenEdit={(token: string | null) => setEditPrToken(token)}
              />
            </div>
          )}
        </div>

        <div className="border-t px-4 py-3 flex items-center justify-between">
          <div className="text-xs text-gray-500">
            {isDirty ? "יש שינויים שלא נשמרו" : "אין שינויים"}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleResendVerification}
              disabled={resendLoading}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
              title="סמן את המשתמש כלא מאומת ושלח מייל אימות"
            >
              {resendLoading ? "שולח…" : "שלח אימות אימייל"}
            </button>

            <button
              onClick={handleSendPasswordReset}
              disabled={resetLoading}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
              title="שלח למשתמש מייל עם קישור לאיפוס הסיסמה"
            >
              {resetLoading ? "שולח…" : "שלח קישור לאיפוס סיסמה"}
            </button>

            <button
              onClick={onClose}
              className="border rounded px-3 py-1.5 text-xs hover:bg-gray-50 cursor-pointer"
            >
              ביטול
            </button>
            {/* 
            <button
              onClick={handleSave}
              disabled={!isDirty || saving || !phoneValid}
              className={`rounded px-3 py-1.5 text-xs text-white ${
                !isDirty || saving || !phoneValid
                  ? "bg-gray-400"
                  : "bg-blue-600 hover:bg-blue-700"
              }`}
            >
              {saving ? "שומר…" : "שמירה"}
            </button> 
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
