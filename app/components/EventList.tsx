"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import type { EventDetails } from "../types/types";
import { Button } from "./ui/button";
import { reverseDateOrder } from "../utilityFunctions/dateFunctions";

type Props = {
  onSelect?: (event: EventDetails) => void;
};

export default function EventList({ onSelect }: Props) {
  const { data: session } = useSession();
  const [events, setEvents] = useState<EventDetails[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      if (!session?.user?.email) return;
      setLoading(true);

      try {
        const res = await fetch(`/api/events?email=${session.user.email}`);
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        } else {
          console.error("Failed to fetch events");
        }
      } catch (err) {
        console.error("Error loading events:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [session]);

  if (loading) return <div>טוען אירועים...</div>;
  if (!events.length) return <div>לא נמצאו אירועים</div>;

  return (
    <div className="flex flex-col gap-2 mt-4">
      {events.map((event) => (
        <div
          key={event._id}
          className="border p-2 rounded shadow bg-white flex justify-between items-center"
        >
          <div>
            <div>
              📅 {reverseDateOrder(event.date)} - {event.eventType}
            </div>
            <div>
              👰 {event.brideFirst} {event.brideLast}
            </div>
            <div>
              🤵 {event.groomFirst} {event.groomLast}
            </div>
            <div>
              📍 {event.venue}, {event.address}
            </div>
          </div>
          {onSelect && (
            <Button onClick={() => onSelect(event)} size="sm">
              בחר
            </Button>
          )}
        </div>
      ))}
    </div>
  );
}
