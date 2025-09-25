"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import type { EventDetails as EventDetailsType } from "../types/types";
import EditEventDetailsDialog from "./EditEventDetailsDialog";
import Stat from "./Stat";
import { reverseDateOrder } from "../utilityFunctions/dateFunctions";

type Props = {
  details: EventDetailsType;
  setDetails: (details: EventDetailsType) => void;
  setEventDetails: (eventDetails: EventDetailsType) => void;
};

const EventDetails = ({ details, setDetails, setEventDetails }: Props) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  // מיפוי שדות לפי סוג אירוע (לתצוגה מקוצרת בראש)
  const fieldsByEventType: Record<
    string,
    {
      icon: string;
      label: string;
      key: keyof EventDetailsType;
      color: string;
    }[]
  > = {
    חתונה: [
      { icon: "👰", label: "שם הכלה", key: "brideFirst", color: "pink" },
      { icon: "🤵", label: "שם החתן", key: "groomFirst", color: "blue" },
      { icon: "👰", label: "משפחת הכלה", key: "brideLast", color: "pink" },
      { icon: "🤵", label: "משפחת החתן", key: "groomLast", color: "blue" },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],
    חינה: [
      { icon: "👰", label: "שם הכלה", key: "brideFirst", color: "pink" },
      { icon: "🤵", label: "שם החתן", key: "groomFirst", color: "blue" },
      { icon: "👰", label: "משפחת הכלה", key: "brideLast", color: "pink" },
      { icon: "🤵", label: "משפחת החתן", key: "groomLast", color: "blue" },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],
    "בר מצווה": [
      {
        icon: "🧒",
        label: "שם חתן בר מצווה",
        key: "groomFirst",
        color: "blue",
      },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],
    "בת מצווה": [
      {
        icon: "👧",
        label: "שם כלת בת מצווה",
        key: "brideFirst",
        color: "pink",
      },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],
    ברית: [
      { icon: "👨‍👩‍👦", label: "שמות ההורים", key: "brideFirst", color: "blue" },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],
    בריתה: [
      { icon: "👨‍👩‍👧", label: "שמות ההורים", key: "brideFirst", color: "pink" },
      { icon: "🏛️", label: "אולם", key: "venue", color: "gray" },
    ],

    "אירוע עסקי": [
      { icon: "🏢", label: "שם האירוע", key: "brideFirst", color: "gray" },
      { icon: "🏢", label: "פרטי החברה", key: "brideLast", color: "gray" },
      { icon: "📍", label: "כתובת", key: "address", color: "gray" },
    ],
    "יום הולדת": [
      { icon: "🎂", label: "שם חוגג/ת", key: "brideFirst", color: "purple" },
      { icon: "📍", label: "כתובת", key: "address", color: "gray" },
    ],
  };

  const commonFields = [
    { icon: "📅", label: "תאריך", key: "date", color: "gray" },
    { icon: "🕒", label: "שעה", key: "time", color: "gray" },
    { icon: "🎉", label: "סוג אירוע", key: "eventType", color: "purple" },
  ];

  // קבוצות לתצוגה המלאה (כרטיסיות)
  const fieldGroupsByEventType: Record<
    string,
    {
      title?: string;
      fields: {
        icon: string;
        label: string;
        render: (details: EventDetailsType) => string;
      }[];
    }[]
  > = {
    חתונה: [
      {
        title: "",
        fields: [
          {
            icon: "👰",
            label: "הכלה",
            render: (d) => `${d.brideFirst || ""} ${d.brideLast || ""}`.trim(),
          },
          {
            icon: "🤵",
            label: "החתן",
            render: (d) => `${d.groomFirst || ""} ${d.groomLast || ""}`.trim(),
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    חינה: [
      {
        title: "",
        fields: [
          {
            icon: "👰",
            label: "הכלה",
            render: (d) => `${d.brideFirst || ""} ${d.brideLast || ""}`.trim(),
          },
          {
            icon: "🤵",
            label: "החתן",
            render: (d) => `${d.groomFirst || ""} ${d.groomLast || ""}`.trim(),
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    "בר מצווה": [
      {
        title: "חתן בר מצווה",
        fields: [
          {
            icon: "🧒",
            label: "שם מלא",
            render: (d) => `${d.groomFirst || ""} ${d.groomLast || ""}`.trim(),
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    "בת מצווה": [
      {
        title: "כלת בת המצווה",
        fields: [
          {
            icon: "👧",
            label: "שם מלא",
            render: (d) => `${d.brideFirst || ""} ${d.brideLast || ""}`.trim(),
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],
    ברית: [
      {
        title: "ההורים",
        fields: [
          {
            icon: "👨‍👩‍👦",
            label: "שמות ההורים",
            render: (d) =>
              d.brideFirst ||
              [d.groomFirst, d.brideFirst].filter(Boolean).join(" ו") ||
              "-",
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    בריתה: [
      {
        title: "ההורים",
        fields: [
          {
            icon: "👨‍👩‍👧",
            label: "שמות ההורים",
            render: (d) =>
              d.brideFirst ||
              [d.groomFirst, d.brideFirst].filter(Boolean).join(" ו") ||
              "-",
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    "יום הולדת": [
      {
        title: "חוגג/ת",
        fields: [
          {
            icon: "🎂",
            label: "שם מלא",
            render: (d) => `${d.brideFirst || ""} ${d.brideLast || ""}`.trim(),
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],

    "אירוע עסקי": [
      {
        title: "",
        fields: [
          {
            icon: "🏢",
            label: "שם האירוע",
            render: (d) => d.brideFirst || "-",
          },
          {
            icon: "🏢",
            label: "בעל האירוע",
            render: (d) => d.brideLast || "-",
          },
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          {
            icon: "📅",
            label: "תאריך",
            render: (d) => (d.date ? reverseDateOrder(d.date) : "-"),
          },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],
  };

  return (
    <div
      className="bg-white p-0 pl-0 rounded-2xl max-w-5xl mx-auto w-full my-2 transition-all hover:scale-103 duration-300"
      dir="rtl"
    >
      {/* <div className="max-w-5xl  w-full" dir="rtl"> */}
      {/* ================= HEADER כגריד 3 עמודות ================= */}
      {/* ================= HEADER של הסקשן ================= */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        style={{ cursor: "pointer" }}
        className={`w-full border border-gray-300 rounded-md shadow p-2   mb-0
    text-blue-600 transition-all duration-300 
    ${isOpen ? "border-b-4 border-blue-500" : ""} 
    grid grid-cols-1 md:grid-cols-[180px_1fr_160px] gap-4 items-start`}
      >
        {/* טור 1 – כותרת */}
        <div className="flex flex-row items-center gap-2">
          <div
            className={`text-base transform transition-transform duration-300 ${
              isOpen ? "rotate-180" : "rotate-0"
            }`}
          >
            {isOpen ? "−" : "+"}
          </div>
          <div className="font-bold text-blue-600 text-base min-w-[150px]">
            פרטי האירוע
          </div>
          {/* <div className="min-w-[220px]">פרטי האירוע</div> */}
        </div>

        {/* טור 2 – תוכן (תקציר כשהסקשן סגור / פירוט כשהוא פתוח) */}
        <div className="w-full">
          {/* כשהסקשן סגור – גריד 3 עמודות, בלי "האירוע יתקיים" */}
          {!isOpen && (
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-2 shadow-sm text-center text-sm text-gray-800 w-full">
              <div className="grid grid-cols-3 sm:grid-cols-3 gap-4">
                {/* אולם / כתובת */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xl">🏛️</span>
                  <span className="font-semibold">
                    {details.venue || details.address || "-"}
                  </span>
                </div>

                {/* תאריך */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xl">📅</span>
                  <span className="font-semibold">
                    {reverseDateOrder(details.date) || "-"}
                  </span>
                </div>

                {/* שעה */}
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <span className="text-xl">🕒</span>
                  <span className="font-semibold">{details.time || "-"}</span>
                </div>
              </div>
            </div>
          )}

          {/* כשהסקשן פתוח – נשאר כמו שהיה (מפה כפולה של קבוצות/שדות) */}
          {isOpen && (
            <div className="flex flex-col gap-4 text-right mt-4 mb-2">
              {(fieldGroupsByEventType[details.eventType || ""] || []).map(
                (group, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    {group.title && (
                      <div className="text-sm font-bold text-blue-700 pr-2">
                        {group.title}
                      </div>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {group.fields.map(({ icon, label, render }) => (
                        <div
                          key={label}
                          className="bg-white border border-gray-300 rounded-xl p-2 shadow-md w-full max-w-[260px] min-h-[100px]"
                        >
                          <div className="flex items-center mb-0.5 text-base">
                            <span className="text-xl">{icon}</span>
                            <span className="font-semibold text-gray-700 text-sm">
                              {label}
                            </span>
                          </div>
                          <div className="text-gray-900 text-sm font-bold break-words">
                            {render(details) || "-"}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )
              )}
            </div>
          )}
        </div>

        {/* טור 3 – כפתור עריכה (רוחב קבוע 160px בזכות ה־grid) */}
        <div
          className="flex items-center justify-end md:justify-center w-full"
          onClick={(e) => e.stopPropagation()}
        >
          <div
            className="w-full text-center px-3 py-2 border border-blue-500 rounded-md text-blue-600 font-semibold text-sm hover:bg-blue-50 transition"
            onClick={() => {
              if (!details.eventType) return;
              setShowEditModal(true);
            }}
          >
            ערוך
          </div>
        </div>
      </div>
      {/* =============== סוף HEADER של הסקשן =============== */}

      {/* =============== סוף HEADER כגריד =============== */}
      {/* </div> */}

      {/* דיאלוג עריכה */}
      <EditEventDetailsDialog
        open={showEditModal}
        onClose={() => setShowEditModal(false)}
        details={details}
        onSave={async (updated) => {
          try {
            const response = await fetch("/api/events", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                ...updated,
                ownerEmail: details.ownerEmail,
                _id: details._id,
              }),
            });

            if (!response.ok) {
              const errorText = await response.text();
              console.error("❌ Response Error:", errorText);
            } else {
              const savedEvent = await response.json();
              setDetails(savedEvent);
              setEventDetails(savedEvent);
            }
          } catch (err) {
            console.error("Error saving event:", err);
          }

          setShowEditModal(false);
        }}
      />
    </div>
  );
};

export default EventDetails;
