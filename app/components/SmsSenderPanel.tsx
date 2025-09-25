"use client";

import { useEffect, useMemo, useState } from "react";
import { useSession } from "next-auth/react";
import { sendSmsByType } from "@/lib/sendSmsByType";
import {
  generateSmsMessageByType,
  type SmsType as SmsTypeAll,
} from "@/lib/generateSmsMessageByType"; // לצורך Preview + טיפוס
import type { Guest, EventDetails } from "../types/types";
import { Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./ui/dialog";
import Stat from "./Stat";
import Link from "next/link";

type SmsType = SmsTypeAll; // local alias

// הסוגים המוצגים בטבלה + ברירות מחדל יחסית לתאריך האירוע
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
    { type: "cancel", label: "6. ביטול האירוע", defaultDaysBefore: 0 }, // ידני בלבד
  ];

type Props = {
  guests: Guest[];
  event: EventDetails | null;
  onSmsSent?: () => void;
  refreshKey?: number;
};

type SendStatus = "ok" | "noRecipients" | "noCredit";
type CancelSegment = "all" | "coming" | "declined" | "noAnswer";

const normalizePhone = (p: string) => (p || "").replace(/\D+/g, "").trim();

// ---------- helpers: שמירה על תאריכים לוקאליים לקריאה נוחה ----------
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toLocalDateInput = (d: Date) =>
  `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;
const toLocalTimeInput = (d: Date) =>
  `${pad2(d.getHours())}:${pad2(d.getMinutes())}`;

// ברירות מחדל לכל סוג לפי תאריך האירוע (או היום אם אין)
const computeDefaults = (eventDate?: string | null) =>
  smsTypes.map((t) => {
    const base = eventDate ? new Date(`${eventDate}T12:00:00`) : new Date();
    // defaultDaysBefore: חיובי → לפני, שלילי → אחרי
    base.setDate(base.getDate() - t.defaultDaysBefore);
    return {
      type: t.type as SmsType,
      date: toLocalDateInput(base),
      time: "12:00",
      checked: false, // נשמר כ-auto ב-DB
    };
  });

export default function SmsSenderPanel({
  guests,
  event,
  onSmsSent,
  refreshKey,
}: Props) {
  const { data: session } = useSession();
  const userEmail = session?.user?.email || "";

  const [userInfo, setUserInfo] = useState<{
    smsBalance: number;
    smsUsed: number;
    subscriptionType: string;
  } | null>(null);

  const [isOpen, setIsOpen] = useState(false);
  const [loadingType, setLoadingType] = useState<SmsType | null>(null);
  const [log, setLog] = useState<string[]>([]);

  // דיאלוג אישור
  const [confirmType, setConfirmType] = useState<SmsType | null>(null);
  const [pendingGuests, setPendingGuests] = useState<Guest[]>([]);

  // שורות הטבלה: מאתחלים לדיפולט של האירוע הנוכחי
  const [selectedTypes, setSelectedTypes] = useState(() =>
    computeDefaults(event?.date)
  );

  // “דלג על מי שכבר קיבל” לכל סוג
  const [alreadySentPhonesByType, setAlreadySentPhonesByType] = useState<
    Partial<Record<SmsType, Set<string>>>
  >({});

  const initialSkip: Record<SmsType, boolean> = {
    saveDate: true,
    invitation: true,
    reminder: true,
    tableNumber: true,
    thankYou: true,
    cancel: true,
  };
  const [skipAlreadyByType, setSkipAlreadyByType] = useState(initialSkip);

  // פילוח לביטול
  const [cancelSegment, setCancelSegment] = useState<CancelSegment>("all");
  const [loadingLogForType, setLoadingLogForType] = useState(false);
  const [logFetchError, setLogFetchError] = useState<string | null>(null);

  // ===== עורך הודעת ביטול (MVP) =====
  const [showCancelEditor, setShowCancelEditor] = useState(false);
  const [cancelCustomText, setCancelCustomText] = useState("");
  const [includeLocation, setIncludeLocation] = useState(true); // אין שעה בשלב זה
  const [shortLink, setShortLink] = useState("");

  // סט מפה guestId->phone עבור לוגים ישנים
  const guestPhoneById = useMemo(() => {
    const m = new Map<string, string>();
    for (const g of guests) {
      if (g?._id) m.set(String(g._id), normalizePhone(g.phone || ""));
    }
    return m;
  }, [guests]);

  // ===== שירותים =====
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

  const getSendStatus = (count: number): SendStatus => {
    if (count <= 0) return "noRecipients";
    if ((userInfo?.smsBalance ?? 0) < count) return "noCredit";
    return "ok";
  };

  const hasPhone = (g: Guest) => (g.phone ?? "").trim() !== "";

  const baseAudienceForType = (type: SmsType) => {
    switch (type) {
      case "saveDate":
        return guests.filter((g) => g.status !== "לא בא" && hasPhone(g));
      case "reminder":
        return guests.filter((g) => g.status === "לא ענה" && hasPhone(g));
      case "invitation":
      case "tableNumber":
      case "thankYou":
        return guests.filter((g) => g.status === "בא" && hasPhone(g));
      case "cancel":
        return guests.filter(hasPhone);
      default:
        return [];
    }
  };

  const countForType = (type: SmsType) => baseAudienceForType(type).length;

  // שליפה + בניית Set של כבר-קיבלו לאותו סוג (עם קאש)
  const ensureAlreadySentPhones = async (type: SmsType) => {
    if (!userEmail || !event?._id) return new Set<string>();
    if (alreadySentPhonesByType[type]) return alreadySentPhonesByType[type]!;

    setLoadingLogForType(true);
    setLogFetchError(null);
    try {
      const params = new URLSearchParams({
        email: userEmail,
        eventId: String(event._id),
        smsType: type,
        ts: String(Date.now()),
      });
      const res = await fetch(`/api/sms-log?${params.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) throw new Error("כשל בשליפת יומן הודעות");
      const data: Array<{ guestPhone?: string; guestId?: string }> =
        await res.json();

      const set = new Set<string>();
      for (const row of data || []) {
        let p = normalizePhone(row.guestPhone || "");
        if (!p && row.guestId) {
          const fallback = guestPhoneById.get(String(row.guestId)) || "";
          p = normalizePhone(fallback);
        }
        if (p) set.add(p);
      }
      setAlreadySentPhonesByType((prev) => ({ ...prev, [type]: set }));
      return set;
    } catch (e: any) {
      console.error("❌ sms-log fetch error:", e);
      setLogFetchError(e?.message || "שגיאה בשליפת נתונים");
      const empty = new Set<string>();
      setAlreadySentPhonesByType((prev) => ({ ...prev, [type]: empty }));
      return empty;
    } finally {
      setLoadingLogForType(false);
    }
  };

  const shouldSkip = (type: SmsType) => {
    // ברירת מחדל = true לכל הסוגים
    return skipAlreadyByType[type] ?? true;
  };

  // חישוב רשימת נמענים לדיאלוג בהתאם לטוגל/פילוח
  const computePendingForDialog = (
    type: SmsType,
    alreadySet: Set<string>,
    skipAlready: boolean,
    segment?: CancelSegment
  ) => {
    let base = baseAudienceForType(type);

    if (type === "cancel" && segment) {
      if (segment === "coming") base = base.filter((g) => g.status === "בא");
      if (segment === "declined")
        base = base.filter((g) => g.status === "לא בא");
      if (segment === "noAnswer")
        base = base.filter((g) => g.status === "לא ענה");
    }

    // דדופליקציה לפי טלפון מנורמל
    const seen = new Set<string>();
    let uniq = base.filter((g) => {
      const p = normalizePhone(g.phone || "");
      if (!p) return false;
      if (seen.has(p)) return false;
      seen.add(p);
      return true;
    });

    if (skipAlready && alreadySet.size) {
      uniq = uniq.filter((g) => !alreadySet.has(normalizePhone(g.phone || "")));
    }

    setPendingGuests(uniq);
  };

  // פתיחת דיאלוג – לכל סוג
  const openConfirmDialog = async (type: SmsType) => {
    if (!event) return;

    if (type === "cancel" && !event.isCanceled) {
      alert("סמן/י קודם את האירוע כ'בוטל' בטולבר, ואז שלח/י הודעת ביטול.");
      return;
    }

    const baseCount = countForType(type);
    if (baseCount === 0) {
      alert("אין נמענים מתאימים לשליחה עבור סוג הודעה זה.");
      return;
    }

    // שמירה על ברירת המחדל (דלוק) אם לא הוגדר ידנית
    setSkipAlreadyByType((prev) => ({ ...prev, [type]: prev[type] ?? true }));

    if (type === "cancel") setCancelSegment("all");

    const alreadySet = await ensureAlreadySentPhones(type);
    computePendingForDialog(
      type,
      alreadySet,
      shouldSkip(type),
      type === "cancel" ? cancelSegment : undefined
    );

    setConfirmType(type);
  };

  // שינוי טוגל "דלג על מי שכבר קיבל"
  const onToggleSkipAlready = (checked: boolean) => {
    if (!confirmType) return;
    setSkipAlreadyByType((prev) => ({ ...prev, [confirmType]: checked }));
    const alreadySet =
      alreadySentPhonesByType[confirmType] || new Set<string>();
    computePendingForDialog(
      confirmType,
      alreadySet,
      checked,
      confirmType === "cancel" ? cancelSegment : undefined
    );
  };

  // שינוי פילוח בביטול
  const onChangeCancelSegment = (seg: CancelSegment) => {
    if (confirmType !== "cancel") return;
    setCancelSegment(seg);
    const alreadySet = alreadySentPhonesByType["cancel"] || new Set<string>();
    const skip = shouldSkip("cancel");
    computePendingForDialog("cancel", alreadySet, skip, seg);
  };

  // תיזמון / צ'קבוקס (לכל סוג שאינו cancel)
  const handleCheckboxChange = async (type: SmsType) => {
    if (type === "cancel") return;
    if (!event || !userEmail) return;

    if (event.isCanceled) {
      alert("אי אפשר להפעיל תיזמון לאירוע מבוטל");
      return;
    }

    const row = selectedTypes.find((t) => t.type === type);
    if (!row) return;

    const newChecked = !row.checked; // auto
    let sendAt = new Date(`${row.date}T${row.time}:00`);

    if (newChecked && sendAt <= new Date()) {
      // UX עדין: דחוף שעה קדימה אוטומטית
      sendAt = new Date(Date.now() + 60 * 60 * 1000);
      setSelectedTypes((prev) =>
        prev.map((t) =>
          t.type === type
            ? {
                ...t,
                checked: newChecked,
                date: toLocalDateInput(sendAt),
                time: toLocalTimeInput(sendAt),
              }
            : t
        )
      );
    } else {
      setSelectedTypes((prev) =>
        prev.map((t) => (t.type === type ? { ...t, checked: newChecked } : t))
      );
    }

    try {
      if (newChecked) {
        // הפעלה (auto=true) + שמירת sendAt
        const res = await fetch("/api/scheduledSms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event._id,
            ownerEmail: userEmail,
            smsType: type,
            sendAt: sendAt.toISOString(), // נשמר UTC ב-DB
            auto: true,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      } else {
        // כיבוי (auto=false) — שומר את התאריך ב־DB
        const res = await fetch("/api/scheduledSms", {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            eventId: event._id,
            ownerEmail: userEmail,
            smsType: type,
            auto: false,
          }),
        });
        if (!res.ok) throw new Error(await res.text());
      }
    } catch (err) {
      console.error("❌ שגיאה ב־check/uncheck:", err);
      alert("שמירת התיזמון נכשלה");
      // החזר מצב UI במקרה כשל
      setSelectedTypes((prev) =>
        prev.map((t) => (t.type === type ? { ...t, checked: !newChecked } : t))
      );
    }
  };

  // שינוי תאריך/שעה – שומר מיידית אם checked=true (auto פעיל)
  const handleDateChange = async (
    type: SmsType,
    field: "date" | "time",
    value: string
  ) => {
    setSelectedTypes((prev) =>
      prev.map((t) => (t.type === type ? { ...t, [field]: value } : t))
    );

    const row = selectedTypes.find((t) => t.type === type);
    if (!row || !event || !userEmail) return;
    if (type === "cancel") return; // אין תיזמון ל-cancel
    if (!row.checked) return; // נשמור רק כשהתיזמון פעיל

    const newDate = field === "date" ? value : row.date;
    const newTime = field === "time" ? value : row.time;
    const sendAt = new Date(`${newDate}T${newTime}:00`);
    if (sendAt <= new Date()) {
      alert("❌ התאריך/שעה חייבים להיות בעתיד");
      return;
    }

    try {
      const res = await fetch("/api/scheduledSms", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          eventId: event._id,
          ownerEmail: userEmail,
          smsType: type,
          sendAt: sendAt.toISOString(), // שומר Date ב־DB
        }),
      });
      if (!res.ok) throw new Error(await res.text());
    } catch (err) {
      console.error("❌ שגיאה בשמירת תאריך/שעה:", err);
      alert("שמירת התאריך/שעה נכשלה");
    }
  };

  // Preview להודעת ביטול (ללא שעה)
  const cancelPreview = useMemo(() => {
    if (!event || confirmType !== "cancel") return "";
    const sampleGuest = { name: "דנה כהן" } as Guest; // לתצוגה בלבד
    try {
      return generateSmsMessageByType("cancel", sampleGuest, event, undefined, {
        cancelCustomText,
        cancelIncludeTime: false, // ללא שעה
        cancelIncludeLocation: includeLocation,
        cancelShortLink: shortLink || undefined,
      });
    } catch {
      // אם המחולל טרם עודכן – להימנע משבירה של הדיאלוג
      return "";
    }
  }, [event, confirmType, cancelCustomText, includeLocation, shortLink]);

  // שליחה בפועל
  const confirmSend = async () => {
    if (!confirmType || !userEmail || !event) return;

    setLoadingType(confirmType);
    let successCount = 0;

    // ✨ נאסוף את המספרים שנשלחו בהצלחה כדי לעדכן את ה-Set המקומי
    const phonesJustSent: string[] = [];

    for (const guest of pendingGuests) {
      const success = await sendSmsByType(
        [guest],
        event,
        confirmType,
        userEmail,
        confirmType === "cancel"
          ? {
              cancelCustomText,
              cancelIncludeTime: false, // ללא שעה
              cancelIncludeLocation: includeLocation,
              cancelShortLink: shortLink || undefined,
            }
          : undefined
      );
      setLog((prev) => [
        ...prev,
        success
          ? `✅ ${guest.name} - ${confirmType} נשלחה`
          : `❌ ${guest.name} - ${confirmType} נכשלה`,
      ]);
      if (success) {
        successCount += 1;
        const p = normalizePhone(guest.phone || "");
        if (p) phonesJustSent.push(p);
      }
    }

    // עדכון יתרה מקומי + רענון אמיתי
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

    // עדכון ה-Set המקומי של "כבר קיבלו" + חישוב מחדש של pending
    if (phonesJustSent.length > 0 && confirmType) {
      setAlreadySentPhonesByType((prev) => {
        const existing = new Set(prev[confirmType] ?? []);
        phonesJustSent.forEach((p) => existing.add(p));
        const skip = shouldSkip(confirmType);
        computePendingForDialog(
          confirmType,
          existing,
          skip,
          confirmType === "cancel" ? cancelSegment : undefined
        );
        return { ...prev, [confirmType]: existing };
      });
    }

    // איפוס הצ'קבוקס לסוג שנשלח
    setSelectedTypes((prev) =>
      prev.map((t) => (t.type === confirmType ? { ...t, checked: false } : t))
    );

    setLoadingType(null);
  };

  // טעינת תיזמונים מה-DB בכל מעבר אירוע/תאריך/ביטול/refreshKey
  useEffect(() => {
    const load = async () => {
      // שלב 1: דיפולטים לפי האירוע הנוכחי
      setSelectedTypes(computeDefaults(event?.date));

      if (!event?._id || !userEmail) return;

      // שלב 2: טעינת תיזמונים מה-DB והלבשה מעל הדיפולטים
      const q = new URLSearchParams({
        eventId: String(event._id),
        ownerEmail: userEmail,
      });

      const res = await fetch(`/api/scheduledSms?${q.toString()}`, {
        cache: "no-store",
      });
      if (!res.ok) return;

      const rows: Array<{
        smsType: Exclude<SmsType, "cancel">;
        sendAt: string;
        auto: boolean;
      }> = await res.json();

      setSelectedTypes((prev) =>
        prev.map((t) => {
          if (t.type === "cancel") return t; // לא מתוזמן במודל
          const row = rows.find((r) => r.smsType === t.type);
          if (!row) return { ...t, checked: false }; // אין שורה ב-DB => כבוי
          const d = new Date(row.sendAt);
          return {
            ...t,
            checked: !!row.auto, // auto→checkbox
            date: toLocalDateInput(d),
            time: toLocalTimeInput(d),
          };
        })
      );
    };

    load();
  }, [event?._id, event?.date, event?.isCanceled, userEmail, refreshKey]);

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
              className={`text-base transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
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

          <div
            className="flex items-center justify-end md:justify-center w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <Link
              href="/pricing"
              className="w-full text-center px-3 py-2 border border-blue-500 rounded-md text-blue-600 font-semibold text-sm hover:bg-blue-50 transition cursor-pointer"
            >
              ניהול מנוי
            </Link>
          </div>
        </button>
      </div>

      {/* הודעה כשהאירוע מבוטל */}
      {event?.isCanceled && (
        <div className="mt-2 mb-2 p-3 rounded border text-right bg-red-50 border-red-200 text-red-700">
          האירוע בוטל – כל התיזמונים הוסרו והפעלתם מושבתת. ניתן לשלוח הודעת{" "}
          <b>ביטול</b> בלבד.
        </div>
      )}

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
                <th className="p-2 text-center">פעולה</th>
              </tr>
            </thead>
            <tbody>
              {selectedTypes.map((t) => {
                const isCancel = t.type === "cancel";
                const schedulingDisabled = !!event?.isCanceled || isCancel;

                const label =
                  smsTypes.find((s) => s.type === t.type)?.label || t.type;
                const recipientsCount = countForType(t.type);
                const status = getSendStatus(recipientsCount);

                const disabledBecauseState =
                  loadingType === t.type ||
                  status !== "ok" ||
                  (isCancel && !event.isCanceled) ||
                  (!isCancel && !!event.isCanceled);

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
                        : "בחר נמענים";

                return (
                  <tr
                    key={t.type}
                    className={`border-t ${isCancel ? "bg-orange-50" : ""}`}
                  >
                    {/* תיזמון */}
                    <td className="text-center">
                      <input
                        type="checkbox"
                        checked={isCancel ? false : t.checked}
                        onChange={() => handleCheckboxChange(t.type)}
                        disabled={schedulingDisabled}
                      />
                    </td>

                    {/* סוג הודעה */}
                    <td className="text-right p-2">{label}</td>

                    {/* תאריך */}
                    <td className="text-right p-2">
                      {isCancel ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <input
                          type="date"
                          value={t.date}
                          onChange={(e) =>
                            handleDateChange(t.type, "date", e.target.value)
                          }
                          className="border rounded p-1"
                          disabled={schedulingDisabled}
                        />
                      )}
                    </td>

                    {/* שעה */}
                    <td className="text-right p-2">
                      {isCancel ? (
                        <span className="text-gray-400">—</span>
                      ) : (
                        <input
                          type="time"
                          value={t.time}
                          onChange={(e) =>
                            handleDateChange(t.type, "time", e.target.value)
                          }
                          className="border rounded p-1"
                          disabled={schedulingDisabled}
                        />
                      )}
                    </td>

                    {/* פעולה */}
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
                        ) : isCancel ? (
                          "בחר נמענים"
                        ) : status === "noRecipients" ? (
                          "אין נמענים"
                        ) : status === "noCredit" ? (
                          "אין מספיק קרדיט"
                        ) : (
                          "מסך שליחה..."
                        )}
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>

          {/* דיאלוג בחירה/אישור */}
          <Dialog
            open={!!confirmType}
            onOpenChange={(open) => {
              if (!open) {
                setConfirmType(null);
                // איפוס עורך הביטול
                setShowCancelEditor(false);
                setCancelCustomText("");
                setIncludeLocation(true);
                setShortLink("");
              }
            }}
          >
            <DialogContent className="max-h-[80vh] overflow-y-auto sm:max-w-[560px]">
              <DialogHeader>
                <DialogTitle>
                  {confirmType === "cancel"
                    ? "בחירת נמענים להודעת ביטול"
                    : "אישור שליחה"}
                </DialogTitle>
              </DialogHeader>

              {confirmType && (
                <div className="text-right space-y-4" dir="rtl">
                  <p>
                    סוג הודעה:{" "}
                    <strong>
                      {smsTypes.find((s) => s.type === confirmType)?.label ||
                        confirmType}
                    </strong>
                  </p>

                  {confirmType === "cancel" && (
                    <div className="grid gap-3">
                      <div>
                        <div className="text-sm font-semibold mb-2">
                          בחר/י סגמנט
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {(
                            [
                              "all",
                              "coming",
                              "declined",
                              "noAnswer",
                            ] as CancelSegment[]
                          ).map((seg) => (
                            <button
                              key={seg}
                              type="button"
                              onClick={() => onChangeCancelSegment(seg)}
                              className={`px-3 py-1 rounded border text-sm ${
                                cancelSegment === seg
                                  ? "bg-blue-600 text-white"
                                  : "bg-white"
                              }`}
                            >
                              {seg === "all"
                                ? "כולם"
                                : seg === "coming"
                                  ? "באים"
                                  : seg === "declined"
                                    ? "לא באים"
                                    : "לא ענו"}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* כפתור טוגל לעורך + העורך עצמו */}
                      <div className="flex items-center justify-between">
                        <div className="text-sm font-semibold">נוסח ההודעה</div>
                        <button
                          type="button"
                          className="px-3 py-1 rounded border text-sm"
                          onClick={() => setShowCancelEditor((v) => !v)}
                        >
                          {showCancelEditor
                            ? "הסתר עורך ההודעה"
                            : "הצג וערוך הודעה"}
                        </button>
                      </div>

                      {showCancelEditor && (
                        <div className="space-y-2 border rounded p-3 bg-gray-50">
                          <label className="block text-sm">
                            הודעת ביטול אישית (לא חובה):
                            <textarea
                              value={cancelCustomText}
                              onChange={(e) =>
                                setCancelCustomText(e.target.value)
                              }
                              placeholder="כאן מכניסים את ההודעה האישית שלך, אם לא תכניס  ישלח הודעה בתבנית ברירת מחדל שמופיעה למטה , שם האורח ישתנה  כמובן ולא ישאר דנה כהן בבקשה שים לב למי אתה שולח (כולם, באים...)"
                              className="w-full min-h-28 border rounded-xl p-3 mt-1"
                            />
                            <div className="text-xs text-gray-500 mt-1">
                              משתנים זמינים:{" "}
                              {
                                "{recipientFirstName} {title} {dateHeb} {venue} {address} {shortLink}"
                              }
                            </div>
                          </label>

                          <div className="flex items-center gap-4 text-sm">
                            <label className="inline-flex items-center gap-2">
                              <input
                                type="checkbox"
                                checked={includeLocation}
                                onChange={(e) =>
                                  setIncludeLocation(e.target.checked)
                                }
                              />
                              לכלול מיקום
                            </label>
                          </div>

                          <label className="block text-sm">
                            קישור קצר (אופציונלי):
                            <input
                              value={shortLink}
                              onChange={(e) => setShortLink(e.target.value)}
                              className="w-full border rounded p-2 mt-1"
                              placeholder="https://mgv.li/abcd"
                            />
                          </label>

                          <div className="border rounded-xl p-3 bg-white">
                            <div className="text-xs text-gray-500 mb-1">
                              תצוגה מקדימה:
                            </div>
                            <pre className="whitespace-pre-wrap text-sm">
                              {cancelPreview}
                            </pre>
                            <div className="text-xs text-gray-500 mt-1">
                              תווים: {cancelPreview.length} | חלקים (עברית≈70):{" "}
                              {Math.ceil(cancelPreview.length / 70)}
                            </div>
                          </div>

                          <div className="flex justify-end">
                            <button
                              type="button"
                              className="px-3 py-1 rounded border text-sm"
                              onClick={() => setCancelCustomText("")}
                            >
                              שחזר ברירת מחדל
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  <div className="flex items-center gap-3">
                    <label className="inline-flex items-center gap-2 text-sm">
                      <input
                        type="checkbox"
                        checked={!!skipAlreadyByType[confirmType]}
                        onChange={(e) => onToggleSkipAlready(e.target.checked)}
                      />
                      דלג/י על מי שכבר קיבל/ה הודעה
                    </label>

                    <span className="text-xs text-gray-600">
                      נמצאו{" "}
                      <b>
                        {loadingLogForType
                          ? "…"
                          : (alreadySentPhonesByType[confirmType]?.size ?? 0)}
                      </b>{" "}
                      שקיבלו הודעה זו בעבר
                      {logFetchError ? (
                        <span className="text-red-600"> — {logFetchError}</span>
                      ) : null}
                    </span>
                  </div>

                  <div className="bg-gray-100 p-3 rounded text-sm text-gray-800 space-y-1 border">
                    <p>
                      💬 הודעות בקופה:{" "}
                      <strong>{userInfo?.smsBalance ?? 0}</strong>
                    </p>
                    <p>
                      📤 ישלחו כעת: <strong>{pendingGuests.length}</strong>
                    </p>
                    <p>
                      🧮 יישאר לאחר השליחה (הערכה):{" "}
                      <strong>
                        {(userInfo?.smsBalance ?? 0) - pendingGuests.length}
                      </strong>
                    </p>
                    {(userInfo?.smsBalance ?? 0) < pendingGuests.length && (
                      <p className="text-red-700">
                        אין מספיק יתרה. ניתן לשדרג במסך{" "}
                        <a
                          className="underline"
                          href="/pricing"
                          target="_blank"
                          rel="noreferrer"
                        >
                          ניהול מנוי
                        </a>
                        .
                      </p>
                    )}
                    {pendingGuests.length === 0 &&
                      !!skipAlreadyByType[confirmType] && (
                        <p className="text-amber-700">
                          אין נמענים חדשים. בטלו את הסינון אם בכל זאת ברצונך
                          לשלוח שוב.
                        </p>
                      )}
                  </div>
                  <div className="sticky bottom-0 bg-white border-t pt-3 mt-3">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => setConfirmType(null)}
                        className="px-4 py-1 rounded border text-sm"
                      >
                        סגור
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
                        ) : getSendStatus(pendingGuests.length) ===
                          "noCredit" ? (
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
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* יומן קצר למסך */}
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
