"use client";

/**
 * ClientDashboard — טעינה ראשונה: בוחר אוטומטית את האירוע האחרון (לפי createdAt)
 * ולא דורך על בחירה ידנית בהמשך.
 */

import { useState, useEffect, useRef } from "react";
import { useSession } from "next-auth/react";
import InvitationImage from "./InvitationImage";
import EventDetails from "./EventDetails";
import WeddingInvitationPreview from "./WeddingInvitationPreview";
import type {
  Guest,
  EventDetails as EventDetailsType,
  Table,
} from "../types/types";
import SmsMessageInvitation from "./SmsMessageInvitation";

import { EventToolbar } from "./EventToolbar";
import GuestAndTableWrapper from "./GuestAndTableWrapper";
import { deleteEventsByEventClient } from "../utilityFunctions/eventFunctions";
import { deleteGuestsByEventClient } from "../utilityFunctions/guestFunctions";
import { deleteTablesByEventClient } from "../utilityFunctions/tableFunctions";
import SmsSenderPanel from "./SmsSenderPanel";
import EventTitle from "./EventTitle";
import NewEventDialog from "./NewEventDialog";
import RsvpView from "./RsvpView";
import RsvpImage from "./RsvpImage";
import SmsLogTable from "./SmsLogTable";
import Spacer from "./Spacer";

const ClientDashboard = () => {
  const { data: session, status } = useSession();

  // ===========================
  // ======== State ========
  // ===========================

  const [guestsList, setGuestsList] = useState<Guest[]>([]);
  const [tables, setTables] = useState<Table[]>([]);
  const [eventDetails, setEventDetails] = useState<EventDetailsType | null>(
    null
  );

  const [details, setDetails] = useState<EventDetailsType>({
    groomFirst: "",
    groomLast: "",
    brideFirst: "",
    brideLast: "",
    date: "",
    time: "",
    venue: "",
    address: "",
    isCanceled: false,
    cancelReason: "",
  });

  // למעלה עם שאר ה־useState
  const [isLoadingEventDetails, setIsLoadingEventDetails] = useState(false);

  // ======== SMS refresh ========
  const [smsRefreshKey, setSmsRefreshKey] = useState(0);
  const onSmsSent = () => setSmsRefreshKey((k) => k + 1);
  useEffect(() => {
    console.log("smsRefreshKey changed ->", smsRefreshKey);
  }, [smsRefreshKey]);

  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [useBackground, setUseBackground] = useState<boolean>(false);

  const [messageText, setMessageText] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);

  // ===========================
  // === דגלים למניעת דריסה ===
  // ===========================
  // המשתמש בחר ידנית (מ־EventToolbar / דיאלוגים)? אם כן — לא נדרוס בחירה
  const userPickedRef = useRef(false);
  // האם כבר עשינו אוטו־סלקט בטעינה הראשונה? כדי שלא יקרה שוב
  const autoSelectDoneRef = useRef(false);

  // ===========================
  // === טעינת אירועים אחת ===
  // ===========================
  const loadEvents = async () => {
    if (!session?.user?.email) return;

    setIsLoadingEventDetails(true);
    try {
      const res = await fetch(`/api/events?email=${session.user.email}`, {
        cache: "no-store",
      });
      const events = await res.json();
      console.log("====Fetched events:=====", events);

      if (!Array.isArray(events)) return;

      if (events.length === 0) {
        setDetails({
          groomFirst: "",
          groomLast: "",
          brideFirst: "",
          brideLast: "",
          date: "",
          time: "",
          venue: "",
          address: "",
          isCanceled: false,
          cancelReason: "",
        });
        setEventDetails(null);
        return;
      }

      if (events.length === 1) {
        setDetails(events[0]);
        setEventDetails(events[0]);
        autoSelectDoneRef.current = true;
        return;
      }

      if (!userPickedRef.current && !autoSelectDoneRef.current) {
        const sortedEvents = [...events].sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        const latest = sortedEvents[0];
        setEventDetails(latest);
        setDetails(latest);
        autoSelectDoneRef.current = true;
        return;
      }
    } finally {
      setIsLoadingEventDetails(false);
    }
  };

  // ריצה ראשונית אחרי שה־session מוכן
  useEffect(() => {
    if (status !== "authenticated") return;
    if (!session?.user?.email) return;
    loadEvents();
    // שים לב: אין תלות ב־eventDetails כדי לא לגרום לדריסה
  }, [status, session?.user?.email]);

  // ===========================
  // === פעולות מחיקה שונות ===
  // ===========================
  const onDeleteEvent = () => {
    if (!eventDetails?._id) return;

    const confirmed = window.confirm(
      "האם אתה בטוח שברצונך למחוק את האירוע וכל הנתונים הקשורים אליו?"
    );
    if (!confirmed) return;
    handleDeleteSchedule();
    handleDeleteSMS(); // מחיקת לוגי SMS
    handleDeleteImage(eventDetails.imagePath); // מחיקת תמונה (אם קיימת)
    handleDeleteTables(); // מחיקת טבלאות
    handleDeleteGuests(); // מחיקת אורחים
    handleDeleteEvents(); // מחיקת האירוע עצמו
  };

  const handleDeleteEvents = async () => {
    console.log("=Deleting events for event Details:", eventDetails);

    const result = await deleteEventsByEventClient(
      eventDetails?._id,
      session?.user?.email || ""
    );

    try {
      alert(`Deleted ${result.deletedCount} events.`);

      if (session?.user?.email) {
        // אחרי מחיקה — נאפשר שוב אוטו־סלקט של "האחרון"
        userPickedRef.current = false;
        autoSelectDoneRef.current = false;
        await loadEvents();
      }
    } catch (err: any) {
      alert("Failed to delete events: " + err.message);
    }
  };

  const handleDeleteGuests = async () => {
    try {
      const result = await deleteGuestsByEventClient(
        eventDetails?._id,
        session?.user?.email || ""
      );
      alert(`Deleted ${result.deletedCount} guests.`);
      setGuestsList([]); // איפוס רשימת אורחים
    } catch (err: any) {
      alert("Failed to delete guests: " + err.message);
    }
  };

  const handleDeleteTables = async () => {
    try {
      const result = await deleteTablesByEventClient(
        eventDetails?._id,
        session?.user?.email || ""
      );
      alert(`Deleted ${result.deletedCount} tables.`);

      setTables([]); // איפוס טבלאות
    } catch (err: any) {
      alert("Failed to delete tables: " + err.message);
    }
  };

  const handleDeleteImage = async (imagePath?: string) => {
    if (!imagePath) return;
    try {
      const res = await fetch("/api/supabase/delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: imagePath }),
      });

      if (!res.ok) {
        const data = await res.json();
        console.error("❌ שגיאה במחיקת התמונה:", data.error);
      } else {
        console.log("✅ תמונה נמחקה בהצלחה:", imagePath);
      }
    } catch (err) {
      console.error("❌ שגיאה כללית במחיקת התמונה:", err);
    }
  };

  // ===========================
  // === מחיקת לוגי SMS =======
  // ===========================
  const deleteSmsLogsByEventClient = async (eventId: string, email: string) => {
    const url = `/api/sms-log?eventId=${eventId}&email=${encodeURIComponent(
      email
    )}`;
    const res = await fetch(url, { method: "DELETE", cache: "no-store" });
    if (!res.ok) throw new Error("Failed to delete SMS logs");
    return (await res.json()) as { deletedCount: number };
  };

  // somewhere in your component (same place you put handleDeleteSMS)
  const handleDeleteSchedule = async () => {
    if (!eventDetails?._id || !session?.user?.email) return;

    const ok = window.confirm(
      "למחוק את כל התיזמונים (Scheduled SMS) לאירוע זה? פעולה זו בלתי הפיכה."
    );
    if (!ok) return;

    // only schedulable types (אין cancel במודל התיזמון)
    const types: Array<
      "saveDate" | "invitation" | "reminder" | "tableNumber" | "thankYou"
    > = ["saveDate", "invitation", "reminder", "tableNumber", "thankYou"];

    try {
      let deleted = 0;
      let notFound = 0;
      let failed = 0;

      await Promise.all(
        types.map(async (smsType) => {
          try {
            const res = await fetch(
              `/api/scheduledSms?eventId=${String(eventDetails._id)}&smsType=${smsType}`,
              { method: "DELETE" }
            );
            if (res.ok) {
              deleted++;
            } else if (res.status === 404) {
              notFound++;
            } else {
              failed++;
            }
          } catch {
            failed++;
          }
        })
      );

      alert(
        `נמחקו ${deleted} תיזמונים.${notFound ? ` לא נמצאו ${notFound}.` : ""}${failed ? ` נכשלו ${failed}.` : ""}`
      );

      // אם SmsSenderPanel נטען לפי refreshKey – עדכן כדי שייטען מחדש ויחזור לברירות־המחדל
      setSmsRefreshKey?.((k: number) => k + 1);
    } catch (e: any) {
      alert("מחיקת התיזמונים נכשלה: " + (e?.message || "לא ידוע"));
    }
  };

  const handleDeleteSMS = async () => {
    if (!eventDetails?._id || !session?.user?.email) return;
    const ok = window.confirm(
      "למחוק את כל לוגי ה-SMS לאירוע זה? פעולה זו בלתי הפיכה."
    );
    if (!ok) return;

    try {
      const { deletedCount } = await deleteSmsLogsByEventClient(
        String(eventDetails._id),
        session.user.email
      );
      alert(`נמחקו ${deletedCount} רשומות SMS.`);
      setSmsRefreshKey((k) => k + 1); // רענון הטבלה
    } catch (e: any) {
      alert("מחיקה נכשלה: " + (e?.message || "לא ידוע"));
    }
  };

  // ===========================
  // === יצירת אירוע ==========
  // ===========================
  const handleCreateEvent = (newEvent: EventDetailsType) => {
    userPickedRef.current = true; // בחירה ידנית — ננעל כדי שלא יהיה אוטו־סלקט
    setDetails(newEvent);
    setEventDetails(newEvent);
    setShowNewEvent(false);
    console.log("אירוע נוצר:", newEvent);
  };

  // ===========================
  // === מסכי מצב סשן =========
  // ===========================
  if (status === "loading") {
    return <p className="text-center mt-4">טוען נתונים...</p>;
  }

  // ===========================
  // ======= רנדר ============
  // ===========================
  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 xl:pt-22 space-y-0">
      <div>
        {/* מציגים את ה-Toolbar רק אם יש טיפוס אירוע (אחרי בחירה/אוטו-סלקט) */}
        {details.eventType && (
          <EventToolbar
            details={details}
            setDetails={(event) => {
              // המשתמש בחר ידנית אירוע מתוך הדיאלוג:
              userPickedRef.current = true;
              setEventDetails(event);
              setDetails(event);
            }}
            onDeleteEvent={onDeleteEvent}
            showNewEvent={showNewEvent}
            setShowNewEvent={setShowNewEvent}
          />
        )}
      </div>

      <EventTitle
        loading={isLoadingEventDetails} // 👈 חדש
        eventType={details.eventType}
        brideName={details.brideFirst}
        brideLast={details.brideLast}
        groomName={details.groomFirst}
        setShowNewEvent={setShowNewEvent}
        isCanceled={details.isCanceled}
      />

      <div>
        <EventDetails
          details={details}
          setDetails={setDetails}
          setEventDetails={setEventDetails}
        />
      </div>

      <div>
        <RsvpImage
          event={eventDetails}
          guest={
            guestsList?.[0] || {
              _id: "demo-id",
              name: "אורח",
              phone: "",
              status: "לא בא",
              count: 1,
              table: "",
              smsCount: 0,
              lastSms: "",
            }
          }
          onUpdate={setEventDetails}
        />
      </div>

      <div className="flex-1 flex justify-center">
        <SmsMessageInvitation
          guest={guestsList[0]}
          details={eventDetails}
          type="invitation"
        />
      </div>

      <SmsSenderPanel
        guests={guestsList}
        event={eventDetails}
        onSmsSent={onSmsSent}
        refreshKey={smsRefreshKey}
      />

      <div className="w-full">
        <SmsLogTable
          ownerEmail={session?.user?.email!}
          eventId={String(eventDetails?._id)}
          guests={guestsList}
          refreshKey={smsRefreshKey}
        />

        <GuestAndTableWrapper
          guestsList={guestsList}
          setGuestsList={setGuestsList}
          tables={tables}
          setTables={setTables}
          eventDetails={details}
          setEventDetails={setDetails}
          onSmsSent={onSmsSent}
          smsRefreshKey={smsRefreshKey}
        />

        <Spacer size={64} />

        <NewEventDialog
          open={showNewEvent}
          onClose={() => setShowNewEvent(false)}
          onCreate={handleCreateEvent}
        />
      </div>
    </div>
  );
};

export default ClientDashboard;
