"use client";

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
import { deleteEventsByEventClient } from "../utilityFunctions/eventFunctions"; //
import { deleteGuestsByEventClient } from "../utilityFunctions/guestFunctions"; //
import { deleteTablesByEventClient } from "../utilityFunctions/tableFunctions"; //
import SmsSenderPanel from "./SmsSenderPanel";
import EventTitle from "./EventTitle";
import NewEventDialog from "./NewEventDialog";
import RsvpView from "./RsvpView";
import RsvpImage from "./RsvpImage";
import SmsLogTable from "./SmsLogTable";
import Spacer from "./Spacer";

const ClientDashboard = () => {
  const { data: session, status } = useSession();
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
  // =========================================
  // ========== State for SMS Dialog =========
  // =========================================
  // State for SMS refresh key
  const [smsRefreshKey, setSmsRefreshKey] = useState(0);
  const onSmsSent = () => setSmsRefreshKey((k) => k + 1); // יקרא אחרי שליחה מוצלחת
  // ======for teesting purposes==========
  useEffect(() => {
    console.log("smsRefreshKey changed ->", smsRefreshKey);
  }, [smsRefreshKey]);
  // end testing purposes
  //
  // ========End of SMS Dialog state
  // =========================================
  //
  const [imageDataUrl, setImageDataUrl] = useState<string>("");
  const [useBackground, setUseBackground] = useState<boolean>(false);

  const [messageText, setMessageText] = useState("");
  const [messageDialogOpen, setMessageDialogOpen] = useState(false);
  const [showNewEvent, setShowNewEvent] = useState(false);
  const fetchEvents = async () => {
    const res = await fetch(`/api/events?email=${session?.user?.email}`, {
      cache: "no-store",
    });
    const events = await res.json();

    if (!Array.isArray(events)) return;

    // =================================================
    // ========טעינה אוטומטית כאשר נכנסים לחשבון==============
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
      setEventDetails(null); // No events found, reset event details
      return;
    }

    if (events.length === 1) {
      setDetails(events[0]);
      setEventDetails(events[0]); // ✅ אירוע יחיד – לבחור אוטומטית
    } else if (events.length > 1) {
      const sortedEvents = events.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      setEventDetails(sortedEvents[0]);
      setDetails(sortedEvents[0]); // ✅ אירועים מרובים – לבחור את האחרון
    }
  };

  const onDeleteEvent = () => {
    if (!eventDetails?._id) return;

    const confirmed = window.confirm(
      "האם אתה בטוח שברצונך למחוק את האירוע וכל הנתונים הקשורים אליו?"
    );
    if (!confirmed) return;

    handleDeleteSMS(); // Call delete SMS logs
    handleDeleteImage(eventDetails.imagePath); // Delete image if exists
    handleDeleteTables(); // Call delete tables
    handleDeleteGuests();
    handleDeleteEvents(); // Then delete events
  };
  // ===================================================
  const handleDeleteEvents = async () => {
    console.log("=Deleting events for event Details:", eventDetails);

    const result = await deleteEventsByEventClient(
      eventDetails?._id,
      session?.user?.email || ""
    );

    try {
      alert(`Deleted ${result.deletedCount} events.`);

      if (session?.user?.email) {
        fetchEvents();
        setDetails(details);
        setEventDetails(details?._id ? null : eventDetails); // Reset event details if needed
      } // Re-fetch events to update the list
    } catch (err: any) {
      alert("Failed to delete guests: " + err.message);
    }
  };
  // ================================================

  // ================================================
  const handleDeleteGuests = async () => {
    try {
      const result = await deleteGuestsByEventClient(
        eventDetails?._id,
        session?.user?.email || ""
      );
      alert(`Deleted ${result.deletedCount} guests.`);

      setGuestsList([]); // Clear guests after deletion
    } catch (err: any) {
      alert("Failed to delete guests: " + err.message);
    }
  };
  // ================================================

  // ================================================
  const handleDeleteTables = async () => {
    try {
      const result = await deleteTablesByEventClient(
        eventDetails?._id,
        session?.user?.email || ""
      );
      alert(`Deleted ${result.deletedCount} tables.`);

      setDetails(details);
      setEventDetails(details?._id ? null : eventDetails); // Reset event details if needed

      setTables([]); // Clear tables after deletion
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

  const deleteSmsLogsByEventClient = async (eventId: string, email: string) => {
    const url = `/api/sms-log?eventId=${eventId}&email=${encodeURIComponent(email)}`;
    const res = await fetch(url, { method: "DELETE", cache: "no-store" });
    if (!res.ok) throw new Error("Failed to delete SMS logs");
    return (await res.json()) as { deletedCount: number };
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

  const handleCreateEvent = (newEvent: EventDetailsType) => {
    setDetails(newEvent);
    setEventDetails(newEvent);
    setShowNewEvent(false);
    console.log("אירוע נוצר:", newEvent);
  };

  useEffect(() => {
    const fetchEvents = async () => {
      const res = await fetch(`/api/events?email=${session?.user?.email}`, {
        cache: "no-store",
      });
      const events = await res.json();
      // ===============================================
      console.log("====Fetched events:=====", events);
      // =================================================
      if (!Array.isArray(events)) return;

      // =================================================
      // ========טעינה אוטומטית כאשר נכנסים לחשבון==============
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
        });
      }
      if (events.length === 1) {
        setDetails(events[0]);
        setEventDetails(events[0]); // ✅ אירוע יחיד – לבחור אוטומטית
      } else if (events.length > 1) {
        const sortedEvents = events.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        );
        setEventDetails(sortedEvents[0]);
        setDetails(sortedEvents[0]); // ✅ אירועים מרובים – לבחור את האחרון
      }
    };

    if (session?.user?.email) {
      fetchEvents();
    }
  }, [session, eventDetails?._id]); // Fetch events when session changes or eventDetails changes
  // ========סוף טעינה אוטומטית כאשר נכנסים לחשבון===
  // ===================================================

  // בדיקת טעינת הסשן
  if (status === "loading") {
    return <p className="text-center mt-4">טוען נתונים...</p>;
  }

  // בדיקת משתמש לא מחובר
  // <div className="text-center p-6">
  //   {!session && (
  //     <div className="bg-yellow-100 border border-yellow-300 text-yellow-800 p-4 rounded mb-6">
  //       <p className="text-lg">
  //         🛑 מצב תצוגה בלבד – אנא התחבר כדי לבצע שינויים
  //       </p>
  //       <button
  //         // onClick={() => signIn()}
  //         className="bg-blue-600 text-white px-4 py-2 rounded mt-2"
  //       >
  //         התחבר עכשיו
  //       </button>
  //     </div>
  //   )}
  // </div>;

  return (
    <div className="max-w-4xl mx-auto px-4 pt-20 space-y-0">
      <div className="">
        {/* {eventDetails?.eventType && ( */}
        {details.eventType && (
          <EventToolbar
            details={details}
            setDetails={(event) => {
              setEventDetails(event);
              setDetails(event);
            }}
            onDeleteEvent={onDeleteEvent}
            showNewEvent={showNewEvent}
            setShowNewEvent={setShowNewEvent}
          />
        )}

        {/* )} */}
      </div>
      <EventTitle
        eventType={details.eventType}
        brideName={details.brideFirst}
        brideLast={details.brideLast}
        groomName={details.groomFirst}
        setShowNewEvent={setShowNewEvent}
      />

      <div>
        <EventDetails
          details={details}
          setDetails={setDetails}
          setEventDetails={setEventDetails}
        />
      </div>
      {/* <InvitationImage
        imageDataUrl={imageDataUrl}
        setImageDataUrl={setImageDataUrl}
      /> */}
      <div>
        {/* {eventDetails && ( */}

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

        {/* <RsvpImage event={eventDetails} onUpdate={setEventDetails} /> */}
        {/* )} */}
      </div>
      <div className="flex-1 flex justify-center">
        <SmsMessageInvitation
          guest={guestsList[0]}
          details={eventDetails}
          type="invitation"
        />
      </div>
      {/* =======sms refresh============================== */}
      {/* <button
        onClick={() => setSmsRefreshKey((k) => k + 1)}
        className="px-2 py-1 text-xs border rounded"
      >
        bump refreshKey
      </button>

      <div className="mb-2 text-xs text-gray-600" dir="ltr">
        refreshKey: <span className="font-mono font-bold">{smsRefreshKey}</span>
      </div> */}
      <SmsSenderPanel
        guests={guestsList}
        event={eventDetails}
        onSmsSent={onSmsSent}
        refreshKey={smsRefreshKey} // 👈 חדש: כדי שירענן את יתרת הקרדיט
      />
      <div className="w-full">
        <SmsLogTable
          ownerEmail={session?.user?.email!}
          eventId={String(eventDetails?._id)}
          guests={guestsList}
          refreshKey={smsRefreshKey} // 👈 חדש: כדי שירענן את הטבלה
        />

        {/* <GuestUploader onUpload={setGuestsList} /> */}

        {/* <GuestAndTableWrapper eventDetails={details} /> */}

        <GuestAndTableWrapper
          guestsList={guestsList}
          setGuestsList={setGuestsList}
          tables={tables}
          setTables={setTables}
          eventDetails={details}
          setEventDetails={setDetails}
          onSmsSent={onSmsSent} // 👈 חדש: כדי שיגיע ל-GuestManager ולדיאלוג
          smsRefreshKey={smsRefreshKey} // 👈 חדש: ירד עד GuestsList
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
