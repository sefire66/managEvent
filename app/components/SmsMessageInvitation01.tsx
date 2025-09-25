"use client";

import React, { useState } from "react";
import type { EventDetails } from "../types/types";
import type { Guest } from "../types/types";
import {
  generateSmsMessageByType,
  SmsType,
} from "@/lib/generateSmsMessageByType";

type Props = {
  details?: EventDetails | null;
  guest?: Guest;
  type: SmsType;
};

const SmsMessageInvitation = ({ details, guest, type }: Props) => {
  // ✅ הגנות פנימיות
  const safeGuest: Guest = {
    _id: guest?._id || "0000",
    name: guest?.name || "אורח/ת",
    phone: guest?.phone || "",
    status: guest?.status || "לא ענה",
    count: guest?.count || 1,
    table: guest?.table || "",
    smsCount: 0,
    lastSms: "",
  };

  const safeDetails: EventDetails = {
    _id: details?._id || "event-id",
    eventType: details?.eventType || "אירוע",
    date: details?.date || "תאריך לא מוגדר",
    time: details?.time || "שעה לא מוגדרת",
    venue: details?.venue || details?.address || "מיקום לא מוגדר",
    address: details?.address || "",
    brideFirst: details?.brideFirst || "",
    brideLast: details?.brideLast || "",
    groomFirst: details?.groomFirst || "",
    groomLast: details?.groomLast || "",
    imageUrl: details?.imageUrl || "",
    ownerEmail: details?.ownerEmail || "",
  };

  // ✅ יצירת קישור RSVP אם רלוונטי
  const rsvpLink =
    type === "invitation" || type === "reminder"
      ? `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${safeGuest._id}`
      : "";

  // ✅ יצירת ההודעה בפועל
  const message = generateSmsMessageByType(
    type,
    safeGuest,
    safeDetails,
    rsvpLink
  );
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white p-1 rounded-2xl max-w-4xl mx-auto w-full mb-1">
      <div className="max-w-4xl mx-auto w-full">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`w-full border border-gray-300 rounded-md shadow p-4 mb-2 text-blue-600 font-bold text-xl text-right transition-all duration-300 ${
            isOpen ? "border-b-4 border-blue-500" : ""
          }`}
          dir="rtl"
        >
          <div className="flex  flex-row items-start justify-between flex-wrap gap-4">
            {/* צד ימין: אייקון + טקסט */}
            <div className="flex flex-col md:flex-row items-start gap-4">
              <div className="flex flex-row items-center gap-2 min-w-[220px]">
                <div
                  className={`text-2xl transform transition-transform duration-300 ${
                    isOpen ? "rotate-180" : "rotate-0"
                  }`}
                >
                  {isOpen ? "−" : "+"}
                </div>
                <div className="font-bold text-blue-600 text-xl min-w-[220px]">
                  תצוגת הודעות
                </div>
              </div>

              {!isOpen && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-base text-gray-700 font-semibold text-right">
                  לחץ כאן כדי לראות כיצד יראו ההודעות שלנו
                </div>
              )}

              {isOpen && (
                <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-base text-gray-700 font-semibold text-right">
                  כאן אפשר לראות איך יראו ההודעות שלנו{" "}
                </div>
              )}
            </div>
          </div>
        </button>

        {isOpen && (
          <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-blue-700 mb-2">
              תצוגת הודעת SMS
            </h2>
            <pre className="whitespace-pre-wrap text-right text-sm text-gray-800">
              {message}
            </pre>
          </div>
        )}
      </div>
    </div>
  );
};

export default SmsMessageInvitation;
