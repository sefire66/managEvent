"use client";

import { useState } from "react";
import InputBox1 from "./ui/InputBox1";
import type { EventDetails as EventDetailsType } from "../types/types";
import EditEventDetailsDialog from "./EditEventDetailsDialog";
import { Button } from "./ui/button";

type Props = {
  details: EventDetailsType;
  setDetails: (details: EventDetailsType) => void;
};

const EventDetails = ({ details, setDetails }: Props) => {
  const [showEditModal, setShowEditModal] = useState(false);
  const [isOpen, setIsOpen] = useState(true);
  return (
    <div className="bg-white rounded-xl shadow p-4 max-w-3xl mx-auto mb-4">
      {/* כפתור כותרת */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full border border-gray-300 rounded-md shadow p-4 mb-2 text-blue-600 font-bold text-xl text-right transition-all duration-300 ${
          isOpen ? "border-b-4 border-blue-500" : ""
        }`}
        dir="rtl"
      >
        <div className="flex flex-row justify-between items-center gap-4">
          {/* אייקון + טקסט */}
          <div className="flex items-center gap-2">
            <div
              className={`text-2xl transform transition-transform duration-300 ${
                isOpen ? "rotate-180" : "rotate-0"
              }`}
            >
              {isOpen ? "−" : "+"}
            </div>
            <div>פרטי האירוע</div>
          </div>

          {/* כפתור עריכה */}
          <Button
            variant="outline"
            size="sm"
            onClick={(e) => {
              e.stopPropagation(); // שלא יסגור את האקורדיון
              setShowEditModal(true);
            }}
          >
            ערוך
          </Button>
        </div>
      </button>

      {/* תוכן מתחת לכותרת */}
      {isOpen && (
        <div className="bg-gray-50 border border-gray-200 rounded-md p-3 text-base font-semibold text-gray-700 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-x-4 gap-y-2 text-right">
          <div>👰 שם הכלה: {details.brideFirst}</div>
          <div>👰 שם משפחת הכלה: {details.brideLast}</div>
          <div>🤵 שם החתן: {details.groomFirst}</div>
          <div>🤵 שם משפחת החתן: {details.groomLast}</div>
          <div>📅 תאריך: {details.date}</div>
          <div>🕒 שעה: {details.time}</div>
          <div>🏛️ אולם: {details.venue}</div>
          <div>📍 כתובת: {details.address}</div>
          <div>🎉 סוג אירוע: {details.eventType || "לא מוגדר"}</div>
        </div>
      )}

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
