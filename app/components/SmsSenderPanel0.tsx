"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import { sendSmsByType } from "@/lib/sendSmsByType";
import type { SmsType } from "@/lib/generateSmsMessageByType"; // ודא שכולל "cancel"
import type { Guest, EventDetails } from "../types/types";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Stat from "./Stat";

const smsTypes: { type: SmsType; label: string; defaultDaysBefore: number }[] =
  [
    { type: "saveDate", label: "1. שמרו את התאריך", defaultDaysBefore: 28 },
    {
      type: "invitation",
      label: "2. הזמנה עם אישור הגעה",
      defaultDaysBefore: 10,
    },
    { type: "reminder", label: "3. תזכורת ללא ענה", defaultDaysBefore: 8 },
    {
      type: "tableNumber",
      label: "4. הודעה ביום האירוע",
      defaultDaysBefore: 0,
    },
    { type: "thankYou", label: "5. תודה אחרי האירוע", defaultDaysBefore: -1 },
    // חדש: ביטול (לא מתוזמן, רק "שלח עכשיו")
    { type: "cancel", label: "6. ביטול האירוע (לכולם)", defaultDaysBefore: 0 },
  ];

type Props = {
  guests: Guest[];
  event: EventDetails | null;
  onSmsSent?: () => void;
  refreshKey?: number;
};

export default function SmsSenderPanel({
  guests,
  event,
  onSmsSent,
  refreshKey,
}: Props) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email;

  const [userInfo, setUserInfo] = useState<{
    smsBalance: number;
    smsUsed: number;
    subscriptionType: string;
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<SmsType | null>(null);
  const [log, setLog] = useState<string[]>([]);
  const [confirmType, setConfirmType] = useState<SmsType | null>(null);
  const [pendingGuests, setPendingGuests] = useState<Guest[]>([]);

  const [selectedTypes, setSelectedTypes] = useState(
    smsTypes.map((t) => {
      const baseDate = event?.date ? new Date(event.date) : new Date();
      baseDate.setDate(baseDate.getDate() - t.defaultDaysBefore);
      return {
        type: t.type,
        date: baseDate.toISOString().split("T")[0],
        time: "12:00",
        checked: false,
      };
    })
  );

  // שליפת יתרה/משתמש
  const fetchUser = async () => {
    try {
      const res = await fetch(`/api/user/me?ts=${Date.now()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("Failed to load user");
      const data = await res.json();
      setUserInfo({
        smsBalance: data.smsBalance,
        smsUsed: data.smsUsed,
        subscriptionType: data.subscriptionType,
      });
    } catch (err) {
      console.error("⚠️ Error fetching sms balance:", err);
    }
  };

  useEffect(() => {
    fetchUser();
  }, []);
  useEffect(() => {
    fetchUser();
  }, [refreshKey]);

  // מונע תיזמון עבור cancel (אין checkbox / date / time פעילים)
  const handleCheckboxChange = async (type: SmsType) => {
    if (type === "cancel") return; // לא מתוזמן
    if (!event || !userEmail) return;

    const checkbox = selectedTypes.find((t) => t.type === type);
    if (!checkbox) return;

    const newChecked = !checkbox.checked;
    const sendAt = new Date(`${checkbox.date}T${checkbox.time}:00`);
    const now = new Date();

    if (newChecked && sendAt <= now) {
      alert("❌ לא ניתן לסמן — התאריך והשעה שנבחרו כבר עברו");
      setSelectedTypes((prev) =>
        prev.map((t) => (t.type === type ? { ...t, checked: false } : t))
      );
      return;
    }

    setSelectedTypes((prev) =>
      prev.map((t) => (t.type === type ? { ...t, checked: newChecked } : t))
    );

    try {
      if (newChecked) {
        await fetch("/api/scheduledSms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event._id,
            smsType: type,
            sendAt: sendAt.toISOString(),
            auto: true,
            ownerEmail: userEmail,
          }),
        });
      } else {
        await fetch(`/api/scheduledSms?eventId=${event._id}&smsType=${type}`, {
          method: "DELETE",
        });
      }
    } catch (err) {
      console.error("❌ שגיאה ב־check/uncheck:", err);
    }
  };

  const handleDateChange = (
    type: SmsType,
    field: "date" | "time",
    value: string
  ) => {
    setSelectedTypes((prev) =>
      prev.map((t) => (t.type === type ? { ...t, [field]: value } : t))
    );
  };

  const getSendStatus = (count: number) => {
    if (count <= 0) return "noRecipients" as const;
    if ((userInfo?.smsBalance ?? 0) < count) return "noCredit" as const;
    return "ok" as const;
  };

  const openConfirmDialog = (type: SmsType) => {
    if (!event) return;

    const hasPhone = (g: Guest) => (g.phone ?? "").trim() !== "";
    let filtered = guests;

    // סינוני קהלים לפי סוג הודעה
    if (type === "saveDate")
      filtered = guests.filter((g) => g.status !== "לא בא" && hasPhone(g));
    if (type === "reminder")
      filtered = guests.filter((g) => g.status === "לא ענה" && hasPhone(g));
    if (["invitation", "tableNumber", "thankYou"].includes(type as string))
      filtered = guests.filter((g) => g.status === "בא" && hasPhone(g));
    if (type === "cancel") {
      // ביטול: לכולם שיש להם טלפון, אבל רק אם האירוע כבר סומן כמבוטל
      if (!event.isCanceled) {
        alert("סמן/י קודם את האירוע כ'בוטל' בטולבר, ואז שלח/י הודעת ביטול.");
        return;
      }
      filtered = guests.filter(hasPhone);
    }

    if (filtered.length === 0) {
      alert("אין נמענים מתאימים לשליחה עבור סוג הודעה זה.");
      return;
    }

    setConfirmType(type);
    setPendingGuests(filtered);
  };

  const confirmSend = async () => {
    if (!confirmType || !userEmail || !event) return;

    setLoadingType(confirmType);
    let successCount = 0;

    for (const guest of pendingGuests) {
      const success = await sendSmsByType(
        [guest],
        event,
        confirmType,
        userEmail
      );
      setLog((prev) => [
        ...prev,
        success
          ? `✅ ${guest.name} - ${confirmType} נשלחה`
          : `❌ ${guest.name} - ${confirmType} נכשלה`,
      ]);
      if (success) successCount += 1;
    }

    if (successCount > 0) {
      setUserInfo((prev) =>
        prev
          ? {
              ...prev,
              smsBalance: Math.max(0, (prev.smsBalance ?? 0) - successCount),
              smsUsed: (prev.smsUsed ?? 0) + successCount,
            }
          : prev
      );
    }

    await fetchUser();
    if (successCount > 0) onSmsSent?.();

    // ניקוי checkbox של אותו סוג
    setSelectedTypes((prev) =>
      prev.map((t) => (t.type === confirmType ? { ...t, checked: false } : t))
    );

    setLoadingType(null);
    setConfirmType(null);
    setPendingGuests([]);
  };

  return (
    <div className="bg-white p-0 rounded-2xl max-w-5xl mx-auto w-full my-1 mb-2 transition-all hover:scale-103 duration-300">
      <div className="max-w-5xl mx-auto w-full">
        {/* HEADER */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: "pointer" }}
          className={`
            w-full border border-gray-300 rounded-md shadow p-2 mb-0
            text-blue-600 text-base text-right transition-all duration-300 
            ${isOpen ? "border-b-4 border-blue-500" : ""}
            grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start
          `}
          dir="rtl"
        >
          <div className="flex flex-row items-center gap-2">
            <div
              className={`text-base transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div className="min-w-[150px] font-bold">שליחת הודעות</div>
          </div>

          <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-700 font-semibold grid grid-cols-3 gap-x-4 gap-y-2 text-right">
            <Stat
              icon="💼"
              label="סוג מנוי"
              value={userInfo?.subscriptionType || ""}
              color="gray"
            />
            <Stat
              icon="💬"
              label="נשלחו"
              value={userInfo?.smsUsed || 0}
              color="red"
            />
            <Stat
              icon="📦"
              label="זמינות"
              value={userInfo?.smsBalance || 0}
              color="blue"
            />
          </div>

          <div className="w-full flex items-center justify-center">
            <a
              href="/pricing"
              className="w-full text-center px-3 py-2 border border-blue-500 rounded-md text-blue-600 font-semibold text-sm hover:bg-blue-50 transition"
              target="_blank"
              rel="noopener noreferrer"
            >
              ניהול מנוי
            </a>
          </div>
        </button>
      </div>

      {/* תוכן נפתח */}
      {isOpen && event && (
        <>
          <table className="w-full text-sm border mb-4" dir="rtl">
            <thead className="bg-gray-100">
              <tr>
                <th className="p-2 text-center">שליחה מתוזמנת</th>
                <th className="p-2 text-right">סוג הודעה</th>
                <th className="p-2 text-right">תאריך</th>
                <th className="p-2 text-right">שעה</th>
                <th className="p-2 text-center">שלח עכשיו</th>
              </tr>
            </thead>
            <tbody>
              {selectedTypes.map((t) => {
                const label =
                  smsTypes.find((s) => s.type === t.type)?.label || t.type;

                // סינון נמענים להצגה מקדימה
                const hasPhone = (g: Guest) => (g.phone ?? "").trim() !== "";
                let filtered = guests;

                if (t.type === "saveDate")
                  filtered = guests.filter(
                    (g) => g.status !== "לא בא" && hasPhone(g)
                  );
                if (t.type === "reminder")
                  filtered = guests.filter(
                    (g) => g.status === "לא ענה" && hasPhone(g)
                  );
                if (
                  ["invitation", "tableNumber", "thankYou"].includes(
                    t.type as string
                  )
                )
                  filtered = guests.filter(
                    (g) => g.status === "בא" && hasPhone(g)
                  );
                if (t.type === "cancel") filtered = guests.filter(hasPhone);

                const recipientsCount = filtered.length;
                const status = getSendStatus(recipientsCount);

                const isCancel = t.type === "cancel";
                const disabledBecauseState =
                  loadingType === t.type ||
                  status !== "ok" ||
                  (isCancel && !event.isCanceled);
                const btnTitle = !isCancel
                  ? status === "noRecipients"
                    ? "אין נמענים מתאימים לשליחה"
                    : status === "noCredit"
                      ? "אין מספיק קרדיט לשליחה"
                      : "שלח עכשיו"
                  : !event.isCanceled
                    ? "סמן/י קודם את האירוע כ'בוטל' בטולבר"
                    : status === "noRecipients"
                      ? "אין נמענים מתאימים לשליחה"
                      : status === "noCredit"
                        ? "אין מספיק קרדיט לשליחה"
                        : "שלח עכשיו";

                return (
                  <tr key={t.type} className="border-t">
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isCancel ? false : t.checked}
                        onChange={() => handleCheckboxChange(t.type)}
                        disabled={isCancel}
                      />
                    </td>
                    <td className="text-right p-2">{label}</td>
                    <td className="text-right p-2">
                      <input
                        type="date"
                        value={t.date}
                        onChange={(e) =>
                          handleDateChange(t.type, "date", e.target.value)
                        }
                        className="border rounded p-1"
                        disabled={isCancel}
                      />
                    </td>
                    <td className="text-right p-2">
                      <input
                        type="time"
                        value={t.time}
                        onChange={(e) =>
                          handleDateChange(t.type, "time", e.target.value)
                        }
                        className="border rounded p-1"
                        disabled={isCancel}
                      />
                    </td>
                    <td className="text-center p-2">
                      <button
                        onClick={() => {
                          if (status === "noRecipients") {
                            alert(
                              "אין נמענים מתאימים לשליחה עבור סוג הודעה זה."
                            );
                            return;
                          }
                          if (isCancel && !event.isCanceled) {
                            alert(
                              "סמן/י קודם את האירוע כ'בוטל' בטולבר, ואז שלח/י הודעת ביטול."
                            );
                            return;
                          }
                          openConfirmDialog(t.type);
                        }}
                        disabled={disabledBecauseState}
                        className={`text-sm px-3 py-1 rounded ${
                          disabledBecauseState
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                        }`}
                        title={btnTitle}
                      >
                        {loadingType === t.type ? (
                          <Loader2 className="animate-spin w-4 h-4" />
                        ) : status === "noRecipients" ? (
                          "אין נמענים"
                        ) : status === "noCredit" ? (
                          "אין מספיק קרדיט"
                        ) : isCancel && !event.isCanceled ? (
                          "סמנו 'בוטל' בטולבר"
                        ) : (
                          "שלח עכשיו"
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          <Dialog
            open={!!confirmType}
            onOpenChange={(open) => !open && setConfirmType(null)}
          >
            <DialogContent>
              <DialogHeader>
                <DialogTitle>אישור שליחה</DialogTitle>
              </DialogHeader>
              {confirmType && (
                <div className="text-right space-y-4">
                  <p>
                    סוג הודעה:{" "}
                    <strong>
                      {smsTypes.find((s) => s.type === confirmType)?.label ||
                        confirmType}
                    </strong>
                  </p>
                  <p>
                    כמות נמענים: <strong>{pendingGuests.length}</strong>
                  </p>

                  <div className="bg-gray-100 p-3 rounded text-sm text-gray-800 space-y-1 border">
                    <p>
                      💬 הודעות בקופה:{" "}
                      <strong>{userInfo?.smsBalance ?? 0}</strong>
                    </p>
                    <p>
                      📤 הודעות שישלחו כעת:{" "}
                      <strong>{pendingGuests.length}</strong>
                    </p>
                    <p>
                      🧮 מה יישאר לאחר השליחה (הערכה):{" "}
                      <strong>
                        {(userInfo?.smsBalance ?? 0) - pendingGuests.length}
                      </strong>
                    </p>
                  </div>

                  <div className="flex justify-end gap-2">
                    <button
                      onClick={() => setConfirmType(null)}
                      className="px-4 py-1 rounded border text-sm"
                    >
                      ביטול
                    </button>
                    <button
                      onClick={confirmSend}
                      disabled={
                        loadingType !== null ||
                        getSendStatus(pendingGuests.length) !== "ok"
                      }
                      className={`px-4 py-1 rounded text-sm flex items-center gap-2 ${
                        loadingType
                          ? "bg-gray-400 text-white cursor-wait"
                          : getSendStatus(pendingGuests.length) === "noCredit"
                            ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                            : "bg-blue-600 text-white hover:bg-blue-700"
                      }`}
                      title={
                        getSendStatus(pendingGuests.length) === "noCredit"
                          ? "אין מספיק קרדיט לשליחה"
                          : "שלח עכשיו"
                      }
                    >
                      {loadingType ? (
                        <>
                          <Loader2 className="animate-spin w-4 h-4" />
                          שולח...
                        </>
                      ) : getSendStatus(pendingGuests.length) === "noCredit" ? (
                        "אין מספיק קרדיט"
                      ) : getSendStatus(pendingGuests.length) ===
                        "noRecipients" ? (
                        "אין נמענים"
                      ) : (
                        "שלח עכשיו"
                      )}
                    </button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {log.length > 0 && (
            <div className="mt-6 max-h-60 overflow-y-auto bg-gray-50 border rounded-md p-3 text-sm leading-relaxed text-right">
              {log.map((line, i) => (
                <div
                  key={i}
                  className={
                    line.includes("✅") ? "text-green-600" : "text-red-600"
                  }
                >
                  {line}
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
