"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import type { EventDetails as EventDetailsType } from "../types/types";
import EditEventDetailsDialog from "./EditEventDetailsDialog";
import Stat from "./Stat";

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
    "אירוע עסקי": [
      { icon: "🏢", label: "שם האירוע", key: "brideFirst", color: "gray" }, // brideFirst = שם האירוע
      { icon: "🏢", label: "פרטי החברה", key: "brideLast", color: "gray" }, // ✅ חדש: brideLast = פרטי החברה
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
          { icon: "📅", label: "תאריך", render: (d) => d.date || "-" },
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
          { icon: "📅", label: "תאריך", render: (d) => d.date || "-" },
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
          { icon: "📅", label: "תאריך", render: (d) => d.date || "-" },
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
          { icon: "📅", label: "תאריך", render: (d) => d.date || "-" },
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
          }, // brideFirst
          {
            icon: "🏢",
            label: "בעל האירוע",
            render: (d) => d.brideLast || "-",
          }, // ✅ brideLast
        ],
      },
      {
        title: "מיקום וזמן",
        fields: [
          { icon: "🏛️", label: "אולם", render: (d) => d.venue || "-" },
          { icon: "📍", label: "כתובת", render: (d) => d.address || "-" },
          { icon: "📅", label: "תאריך", render: (d) => d.date || "-" },
          { icon: "🕒", label: "שעה", render: (d) => d.time || "-" },
        ],
      },
    ],
  };

  return (
    <div className="bg-white p-1 rounded-2xl max-w-4xl mx-auto w-full mt-5">
      <div className="max-w-4xl mx-auto w-full" dir="rtl">
        <div
          onClick={() => setIsOpen(!isOpen)}
          role="button"
          className={`w-full border border-gray-300 rounded-md shadow p-2 mb-1 text-blue-600 font-bold text-xl text-right transition-all duration-300 cursor-pointer ${isOpen ? "border-b-4 border-blue-500" : ""}`}
        >
          <div className="flex flex-col gap-2 md:flex-row md:items-start md:justify-start ">
            {/* צד ימין: אייקון + טקסט */}
            <div className="flex flex-row items-center gap-2">
              <div
                className={`text-2xl transform transition-transform duration-300 ${isOpen ? "rotate-180" : "rotate-0"}`}
              >
                {isOpen ? "−" : "+"}
              </div>
              <div className="min-w-[220px]">פרטי האירוע</div>
            </div>

            {/* מידע מצומצם כשהסקשן סגור */}
            {!isOpen && (
              <div className="flex flex-col sm:flex-row flex-wrap items-start gap-4 p-2 w-full md:max-w-[600]">
                <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm text-center text-sm text-gray-800 w-full">
                  <div className="mx-1 whitespace-nowrap align-middle">
                    <span className="mx-1 text-sm align-middle">
                      האירוע יתקיים
                    </span>
                    <span className="mx-1 text-xl align-middle">🏛️</span>
                    <span className="font-semibold align-middle">
                      {details.venue || details.address
                        ? `ב${details.venue || details.address}`
                        : "-"}
                    </span>
                  </div>

                  <div className="inline-block mx-2 whitespace-nowrap align-middle">
                    <span className="text-xl align-middle">📅</span>
                    <span className="mx-1 align-middle">בתאריך</span>
                    <span className="font-semibold align-middle">
                      {details.date || "-"}
                    </span>
                  </div>

                  <div className="inline-block mx-2 whitespace-nowrap align-middle">
                    <span className="text-xl align-middle">🕒</span>
                    <span className="mx-1 align-middle">בשעה</span>
                    <span className="font-semibold align-middle">
                      {details.time || "-"}
                    </span>
                  </div>
                </div>
              </div>
            )}

            {/* לוח הבקרה המלא כשהסקשן פתוח */}
            {isOpen && (
              <div className="flex flex-col gap-6 text-right mt-4">
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

            {isOpen && !details.eventType && (
              <div className="bg-gray-50 border border-gray-200 rounded-xl p-3 shadow-sm text-center text-sm w-full  text-red-600 font-semibold max-w-[600px]">
                <h1>כדי להמשיך לחץ על הכפתור צור ארוע חדש</h1>
              </div>
            )}

            {/* כפתור ערוך – נפרד מהאזור הלחיץ */}
            <div
              className="flex items-center justify-center gap-1  ml-2 px-4 py-2 border border-blue-500 text-blue-600 font-semibold text-sm rounded-md hover:bg-blue-50 transition w-full md:w-fit min-w-[130px]"
              onClick={(e) => {
                if (!details.eventType) return;
                e.stopPropagation();
                setShowEditModal(true);
              }}
            >
              ערוך
            </div>
          </div>
        </div>
      </div>

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
