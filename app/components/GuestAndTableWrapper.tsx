"use client";

import React, { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import GuestManager from "./GuestManager";
import TableManager from "./TableManager";
import type { Guest, Table, EventDetails } from "../types/types";

interface GuestAndTableWrapperProps {
  guestsList: Guest[]; // Optional prop for initial guest list
  setGuestsList: React.Dispatch<React.SetStateAction<Guest[]>>; // Optional prop for setting guest list
  tables: Table[]; // Optional prop for initial tables list
  setTables: React.Dispatch<React.SetStateAction<Table[]>>; // Optional prop for setting tables list
  eventDetails: EventDetails; // Required prop for event details
  setEventDetails: React.Dispatch<React.SetStateAction<EventDetails>>; // Optional prop for setting event details
  // Note: setEventDetails is optional here, but you can add it if needed
  onSmsSent: () => void;
  smsRefreshKey: number;
}

const GuestAndTableWrapper = ({
  guestsList,
  setGuestsList,
  tables,
  setTables,
  eventDetails,
  setEventDetails,
  onSmsSent,
  smsRefreshKey,
}: GuestAndTableWrapperProps) => {
  const { data: session } = useSession();
  const [loadingGuests, setLoadingGuests] = useState(false);

  const [loadingTables, setLoadingTables] = useState(false);
  // const [guestsList, setGuestsList] = useState<Guest[]>([]);
  // const [tables, setTables] = useState<Table[]>([]);

  //   console.log("🚦 guestsList:", guestsList);
  //   console.log("🚦 tables:", tables);

  // ========== Fetch guests from DB ======================

  // ========== Fetch guests from DB ======================
  useEffect(() => {
    if (!eventDetails?._id) {
      setGuestsList([]);
      return;
    }

    const controller = new AbortController();
    const fetchGuests = async (email: string) => {
      setLoadingGuests(true);
      try {
        const res = await fetch(
          `/api/guests?email=${email}&eventId=${eventDetails._id}`,
          { signal: controller.signal }
        );
        const data = await res.json();
        setGuestsList(Array.isArray(data) ? data : []);
      } catch (error) {
        if ((error as any).name !== "AbortError") {
          console.error("🚨 Failed to fetch guest list:", error);
          setGuestsList([]);
        }
      } finally {
        setLoadingGuests(false);
      }
    };

    if (session?.user?.email) {
      fetchGuests(session.user.email);
    }

    return () => controller.abort();
  }, [session?.user?.email, eventDetails?._id]);

  // ====================== Fetch tables from DB ======================
  useEffect(() => {
    if (!eventDetails?._id) {
      console.log("ℹ️ No event selected — clearing table list");

      setTables([]); // ✅ מנקה שולחנות // ✅ מנקה את רשימת האורחים
      return;
    }

    const fetchTables = async (email: string) => {
      try {
        const res = await fetch(
          `/api/tables?email=${email}&eventId=${eventDetails._id}`
        );
        const data = await res.json();

        if (!Array.isArray(data)) {
          console.error("❌ Tables API returned invalid data:", data);
          setTables([]);
          return;
        }

        setTables(data);
      } catch (error) {
        console.error("🚨 Failed to fetch table list:", error);
        setTables([]);
      }
    };

    if (session?.user?.email) {
      fetchTables(session.user.email);
    }
  }, [session, eventDetails._id]);

  return (
    <div
    // className="w-full space-y-6 max-w-4xl mx-auto"
    >
      {/* Guests section */}
      <GuestManager
        guestsList={guestsList}
        setGuestsList={setGuestsList}
        tables={tables}
        setTables={setTables}
        eventDetails={eventDetails}
        onSmsSent={onSmsSent}
        smsRefreshKey={smsRefreshKey}
        loadingGuests={loadingGuests}
      />

      <TableManager
        tables={tables}
        setTables={setTables}
        guestsList={guestsList}
        setGuestsList={setGuestsList} // ✅ ADD THIS LINE
        eventDetails={eventDetails}
      />
    </div>
  );
};

export default GuestAndTableWrapper;
