"use client";

import React, { useEffect, useState } from "react";
import GuestItem from "./GuestItem";
import type { Table, Guest } from "../types/types";
import { getAvailableSeats } from "../utilityFunctions/tableFunctions";

type SmsLogRow = {
  _id: string;
  guestPhone: string;
  eventId: string;
  smsType: "saveDate" | "invitation" | "reminder" | "tableNumber" | "thankYou";
  status: "sent" | "failed";
  sentAt: string; // ISO
  ownerEmail: string;
};

interface GuestsListProps {
  guestsList: Guest[];
  updateGuest: (id: string, updatedGuest: Partial<Guest>) => void;
  deleteGuest: (id: string) => void;
  openEditGuest: (guest: Guest) => void;
  tables: Table[];
  onSendSms: (guest: Guest) => void;
  ownerEmail: string; // 👈 חדש
  eventId: string; // 👈 חדש
  refreshKey?: number;
}

const GuestsList = ({
  guestsList,
  updateGuest,
  deleteGuest,
  openEditGuest,
  tables,
  onSendSms,
  ownerEmail,
  eventId,
  refreshKey,
}: GuestsListProps) => {
  // guestId -> last sent ISO date (or null)
  const [lastSmsMap, setLastSmsMap] = useState<Record<string, string | null>>(
    {}
  );

  useEffect(() => {
    let abort = false;
    (async () => {
      if (!ownerEmail || !eventId) return;
      try {
        const params = new URLSearchParams({ email: ownerEmail, eventId });
        const res = await fetch(`/api/sms-log?${params.toString()}`);
        if (!res.ok) throw new Error("failed to fetch sms logs");
        const data: SmsLogRow[] = await res.json();

        console.log(
          "this is the res.json response in guestList componenet",
          data
        );

        const map: Record<string, string | null> = {};
        (data || []).forEach((row) => {
          if (row.status !== "sent") return;
          const gid = String(row.guestPhone);
          const cur = new Date(row.sentAt);
          const prevIso = map[gid];
          const prev = prevIso ? new Date(prevIso) : null;
          if (!prev || cur > prev) map[gid] = cur.toISOString();
        });
        if (!abort) setLastSmsMap(map);
      } catch {
        if (!abort) setLastSmsMap({});
      }
    })();
    return () => {
      abort = true;
    };
  }, [ownerEmail, eventId, refreshKey]);

  return (
    <div
      className="w-full bg-white border rounded-2xl shadow-md p-4 max-w-4xl mx-auto max-h-96 overflow-y-auto"
      style={{ direction: "ltr" }}
    >
      <div className=" space-y-3 px-2" style={{ direction: "rtl" }}>
        {(guestsList || []).map((guest) => {
          const table = (tables || []).find((t) => t.number === guest.table);
          const availableSeats = table
            ? getAvailableSeats(table, guestsList)
            : null;

          const lastSmsAt = lastSmsMap[String(guest.phone)] ?? null;

          return (
            <GuestItem
              key={guest._id}
              guest={guest}
              updateGuest={updateGuest}
              deleteGuest={deleteGuest}
              onEdit={() => openEditGuest?.(guest)}
              availableSeats={availableSeats ?? 0}
              onSendSms={onSendSms}
              // lastSmsAt={lastSmsMap[String(guest._id)] ?? null}
              lastSmsAt={lastSmsAt}
            />
          );
        })}
      </div>
    </div>
  );
};

export default GuestsList;
