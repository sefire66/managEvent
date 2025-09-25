"use client";

import React, { useState } from "react";
import type { EventDetails } from "../types/types";
import type { Guest } from "../types/types";
import {
  generateSmsMessageByType,
  SmsType,
} from "@/lib/generateSmsMessageByType";
import { reverseDateOrder } from "../utilityFunctions/dateFunctions";

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
    date: reverseDateOrder(details?.date ?? "") || "תאריך לא מוגדר",
    time: details?.time || "שעה לא מוגדרת",
    venue: details?.venue || details?.address || "מיקום לא מוגדר",
    address: details?.address || "",
    brideFirst: details?.brideFirst || "",
    brideLast: details?.brideLast || "",
    groomFirst: details?.groomFirst || "",
    groomLast: details?.groomLast || "",
    imageUrl: details?.imageUrl || "",
    ownerEmail: details?.ownerEmail || "",
    googleMapsLink: details?.googleMapsLink || "",
    wazeLink: details?.wazeLink || "",
  };

  const typesToShow: SmsType[] = [
    "saveDate",
    "invitation",
    "reminder",
    "tableNumber",
    "thankYou",
  ];

  const smsTypeLabel = (type: SmsType) => {
    switch (type) {
      case "saveDate":
        return "💌 שמור את התאריך";
      case "invitation":
        return "📨 הזמנה לאירוע";
      case "reminder":
        return "🔔 תזכורת למוזמנים שלא הגיבו";
      case "tableNumber":
        return "🍽️ הודעה ביום האירוע";
      case "thankYou":
        return "🙏 תודה לאחר האירוע";
      default:
        return type;
    }
  };

  const messages = typesToShow.map((smsType) => {
    const rsvpLink =
      smsType === "invitation" || smsType === "reminder"
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/invite/${safeGuest._id}`
        : "";
    // ======================================
    console.log(
      "smsType:",
      smsType,
      "safeGuest._id:",
      safeGuest._id,
      "rsvpLink:",
      rsvpLink
    );

    // ======================================
    const text = generateSmsMessageByType(
      smsType,
      safeGuest,
      safeDetails,
      rsvpLink
    );

    return { type: smsType, text };
  });

  // =============================
  console.log("messages:", messages);
  // =============================
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="bg-white p-0 rounded-2xl max-w-5xl mx-auto w-full  my-1 transition-all hover:scale-103 duration-300">
      <div className="max-w-5xl mx-auto w-full">
        {/* ================= HEADER כגריד תלת-עמודתי (180px | 1fr | 160px) ================= */}
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          style={{ cursor: "pointer" }}
          className={`
            w-full border border-gray-300 rounded-md shadow p-2 mb-0
            text-blue-600  text-base text-right transition-all duration-300 
            ${isOpen ? "border-b-4 border-blue-500" : ""}
            grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start
          `}
          dir="rtl"
        >
          {/* עמודה 1 – כותרת */}
          <div className="flex flex-row items-center gap-2">
            <div
              className={`text-base transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div className="font-bold text-blue-600 text-base min-w-[150px]">
              תצוגת הודעות
            </div>
          </div>

          {/* עמודה 2 – תוכן (משתנה לפי מצב) */}
          <div className="w-full">
            {!isOpen && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 text-sm text-gray-700 font-semibold text-center">
                לחץ כאן כדי לראות כיצד יראו ההודעות שלכם
              </div>
            )}

            {isOpen && (
              <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-sm text-gray-700 font-semibold text-center">
                כאן אפשר לראות איך יראו ההודעות שלכם
              </div>
            )}
          </div>

          {/* עמודה 3 – שמור ריק/פעולה עתידית; שומר רוחב אחיד ומילוי מלא */}
          <div className="flex items-center justify-center w-full">
            {/* אפשר להוסיף כאן כפתור פעולה בעתיד; שים לב להשאיר w-full כדי למלא 160px */}
            {/* <button className="w-full px-3 py-2 border rounded-md text-sm">שלח הודעת ניסיון</button> */}
          </div>
        </button>
        {/* =============== סוף HEADER =============== */}

        {/* ================= תוכן נפתח ================= */}
        {isOpen && (
          <div className="bg-white p-4 rounded-xl shadow border max-w-xl mx-auto">
            <h2 className="text-lg font-bold text-blue-700 mb-2">
              תצוגת הודעת SMS
            </h2>
            {messages.map((m) => (
              <div
                key={m.type}
                className="mb-4 border rounded-lg bg-gray-50 p-4"
              >
                <h3 className="text-base font-bold text-blue-700 mb-2">
                  {smsTypeLabel(m.type)}
                </h3>
                <pre className="whitespace-pre-wrap text-right text-sm text-gray-800">
                  {m.text}
                </pre>
              </div>
            ))}
          </div>
        )}
        {/* =============== סוף תוכן נפתח =============== */}
      </div>
    </div>
  );
};

export default SmsMessageInvitation;
