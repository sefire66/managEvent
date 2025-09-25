"use client";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { useEffect, useMemo, useState } from "react";
import type { Guest, EventDetails } from "../types/types";
import { sendSmsByType } from "@/lib/sendSmsByType";
import { useSession } from "next-auth/react";

const smsOptions = [
  { type: "saveDate", label: "שמור את התאריך" },
  { type: "invitation", label: "הזמנה עם לינק אישור" },
  { type: "reminder", label: "תזכורת לאורחים שלא ענו" },
  { type: "tableNumber", label: "מספר שולחן ביום האירוע" },
  { type: "thankYou", label: "תודה על ההשתתפות" },
] as const;

type SmsType = (typeof smsOptions)[number]["type"];

type Props = {
  guest: Guest;
  event: EventDetails;
  onClose: () => void;
  onSmsSent?: () => void; // 👈 חדש
};

export default function SendSmsDialog({
  guest,
  event,
  onClose,
  onSmsSent,
}: Props) {
  const { data: session } = useSession();
  const ownerEmail = session?.user?.email || "";

  const [selectedType, setSelectedType] = useState<SmsType | "">("");
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [sending, setSending] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // יתרת קרדיט
  const [smsBalance, setSmsBalance] = useState<number | null>(null);

  // מפה: לכל סוג – זמן השליחה האחרון (אם קיים)
  const [lastSentMap, setLastSentMap] = useState<
    Record<SmsType, string | null>
  >({
    saveDate: null,
    invitation: null,
    reminder: null,
    tableNumber: null,
    thankYou: null,
  });

  // פונקציה לריענון הקרדיט
  const fetchSmsBalance = async () => {
    if (!ownerEmail) return;
    try {
      const r = await fetch(
        `/api/user/by-email?email=${encodeURIComponent(ownerEmail)}`
      );
      const data = await r.json();
      if (r.ok && data?.user) {
        setSmsBalance(Number(data.user.smsBalance ?? 0));
      }
    } catch {
      /* ignore */
    }
  };

  // שליפת קרדיט בתחילת המודאל
  useEffect(() => {
    fetchSmsBalance();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ownerEmail]);

  // טעינת לוגים לכל האורח/אירוע
  const logsQueryUrl = useMemo(() => {
    if (!ownerEmail || !event?._id || !guest?.phone) return null;
    const params = new URLSearchParams({
      email: ownerEmail,
      eventId: String(event._id),
      guestPhone: String(guest.phone),
    });

    return `/api/sms-log?${params.toString()}`;
  }, [ownerEmail, event?._id, guest?.phone]);

  useEffect(() => {
    setSelectedType("");
    setSuccess(false);
    setError(null);
  }, [guest?._id, event?._id]);

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!logsQueryUrl) return;
      setLoadingLogs(true);
      setError(null);
      try {
        const res = await fetch(logsQueryUrl);
        if (!res.ok) throw new Error("כשל בשליפת לוגים");
        console.log("this is logsQueryUrl :", logsQueryUrl);
        const data: Array<{
          smsType: SmsType;
          status: "sent" | "failed";
          sentAt: string;
        }> = await res.json();

        const map: Record<SmsType, string | null> = {
          saveDate: null,
          invitation: null,
          reminder: null,
          tableNumber: null,
          thankYou: null,
        };

        (data || []).forEach((row) => {
          if (row.status === "sent") {
            const prev = map[row.smsType] ? new Date(map[row.smsType]!) : null;
            const cur = new Date(row.sentAt);
            if (!prev || cur > prev) map[row.smsType] = cur.toISOString();
          }
        });

        if (!abort) setLastSentMap(map);
      } catch (e: any) {
        if (!abort) setError(e?.message || "שגיאה לא צפויה");
      } finally {
        if (!abort) setLoadingLogs(false);
      }
    })();
    return () => {
      abort = true;
    };
  }, [logsQueryUrl]);

  const handleSend = async () => {
    if (!selectedType || !event || !ownerEmail) return;
    if (smsBalance !== null && smsBalance <= 0) return; // אין קרדיט – לא שולחים
    setSending(true);
    setError(null);

    try {
      const result = await sendSmsByType(
        [guest],
        event,
        selectedType as SmsType,
        ownerEmail
      );

      if (result) {
        setSuccess(true);
        // עדכון חיווי מיידי
        setLastSentMap((m) => ({
          ...m,
          [selectedType as SmsType]: new Date().toISOString(),
        }));

        // עדכון יתרה מקומית לחוויית UI חלקה
        setSmsBalance((prev) => (prev == null ? prev : Math.max(0, prev - 1)));

        // ריענון קרדיט אחרי שליחה
        await fetchSmsBalance();

        // 🔔 טריגר להורה לרענן טבלאות/רשימות
        onSmsSent?.();
      } else {
        setError("❌ השליחה נכשלה");
      }
    } catch {
      setError("❌ שגיאה כללית בשליחה");
    } finally {
      setSending(false);
    }
  };

  // חיווי ליד שם ההודעה (12px)
  const TypeBadge = ({ type }: { type: SmsType }) => {
    const iso = lastSentMap[type];
    if (loadingLogs) {
      return <span className="ml-2 text-[12px] text-gray-500">טוען…</span>;
    }
    if (!iso) {
      return <span className="ml-2 text-[12px] text-gray-500">לא נשלח</span>;
    }
    return (
      <span className="ml-2 text-[12px] text-green-700">
        נשלח: {new Date(iso).toLocaleString()}
      </span>
    );
  };

  const noCredit = smsBalance !== null && smsBalance <= 0;

  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="text-xs w-full !max-w-[400px]  " dir="rtl">
        <DialogHeader>
          <DialogTitle className="text-xs">
            שלח SMS לאורח: <span className="font-normal">{guest.name}</span>
          </DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-2 text-right">
          {/* מידע על הקרדיט (אופציונלי) */}
          {smsBalance !== null && (
            <div className="text-[12px] text-gray-600">
              יתרת קרדיט: <span className="font-bold">{smsBalance}</span>
            </div>
          )}

          {/* כפתורי סוג הודעה + חיווי */}
          <div className="grid grid-cols-1 gap-2  ">
            {smsOptions.map((opt) => (
              <button
                key={opt.type}
                onClick={() => setSelectedType(opt.type)}
                disabled={sending || noCredit}
                className={`p-2 rounded border text-xs flex items-center justify-between ${
                  selectedType === opt.type
                    ? "bg-blue-100 border-blue-500"
                    : "hover:bg-gray-100"
                } ${noCredit ? "opacity-60 cursor-not-allowed" : ""}`}
              >
                <span>{opt.label}</span>
                <TypeBadge type={opt.type} />
              </button>
            ))}
          </div>

          <button
            onClick={handleSend}
            disabled={!selectedType || sending || noCredit}
            className={`bg-blue-600 text-white py-2 px-4 rounded mt-2 disabled:opacity-50 text-xs ${
              noCredit ? "cursor-not-allowed" : ""
            }`}
          >
            {noCredit
              ? "אין לך קרדיט לשליחה"
              : sending
                ? "שולח..."
                : "שלח הודעה"}
          </button>

          {success && (
            <div className="text-green-600 text-xs">ההודעה נשלחה בהצלחה ✅</div>
          )}
          {error && <div className="text-red-600 text-xs">{error}</div>}
        </div>
      </DialogContent>
    </Dialog>
  );
}
