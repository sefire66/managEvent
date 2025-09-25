"use client";

import React from "react";
import type { EventDetails } from "../types/types";

type Props = {
  details: EventDetails;
  guestName?: string;
  rsvpLink: string;
};

const SmsMessageInvitation = ({
  details,
  guestName = "אורחים יקרים",
  rsvpLink,
}: Props) => {
  const {
    groomFirst,
    groomLast,
    brideFirst,
    brideLast,
    date,
    time,
    venue,
    address,
  } = details;

  const message = `שלום ${guestName},

הוזמנתם לחתונה של ${groomFirst} ${groomLast} ו־${brideFirst} ${brideLast}.

האירוע יתקיים בתאריך ${date} בשעה ${time}, ב"${venue}" בכתובת: ${address}.

לאישור הגעה אנא לחצו על הקישור:
${rsvpLink}`;

  return (
    <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto">
      <h2 className="text-lg font-bold text-blue-700 mb-2">תצוגת הודעת SMS</h2>
      <pre className="whitespace-pre-wrap text-right text-sm text-gray-800">
        {message}
      </pre>
    </div>
  );
};

export default SmsMessageInvitation;
