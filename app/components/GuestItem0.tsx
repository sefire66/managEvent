"use client";

import React, { useEffect, useState } from "react";
import {
  Trash2,
  Send,
  Table,
  UtensilsCrossed,
  Phone,
  PhoneCall,
  User,
  Users,
} from "lucide-react";

import type { Guest } from "../types/types";
import TableBadge from "./TableBadge";
import StatusBadge from "./StatusBadge";

const isValidPhone = (phone: string): boolean => {
  const phoneRegex = /^05\d{8}$/;
  return phoneRegex.test(phone);
};

type Props = {
  guest: Guest;
  updateGuest: (id: string, updated: Partial<Guest>) => void;
  deleteGuest: (id: string) => void; // Function to delete a guest
  onEdit?: () => void;
  availableSeats: number;
  onSendSms?: (guest: Guest) => void;
  lastSmsAt?: string | null; // 👈 NEW: last SMS timestamp (ISO) or null
};

const GuestItem = ({
  guest,
  updateGuest,
  deleteGuest,
  onEdit,
  availableSeats,
  onSendSms,
  lastSmsAt,
}: Props) => {
  const [phoneError, setPhoneError] = useState(false);

  const handleChange = (field: keyof Guest, value: string | number) => {
    updateGuest(guest._id, { [field]: value });
    if (field === "phone") setPhoneError(!isValidPhone(String(value)));
  };

  const [animate, setAnimate] = useState(false);
  useEffect(() => {
    setAnimate(true);
    const timeout = setTimeout(() => setAnimate(false), 1000);
    return () => clearTimeout(timeout);
  }, [guest]);

  return (
    <div
      className={`w-full bg-white border rounded-lg shadow-sm px-4 py-2 flex flex-col md:flex-row justify-between items-center text-sm font-bold transition-all hover:scale-103  duration-300`}
      style={{ direction: "rtl", cursor: "pointer" }}
      onClick={onEdit}
    >
      {/* עמודת פרטים עיקריים */}
      <div className="flex flex-col md:flex-row items-center gap-1 w-full md:w-3/5 ">
        {/* שם + חיווי SMS */}
        <div className="flex items-center gap-1">
          <User size={18} />
          <input
            type="text"
            readOnly
            value={guest.name}
            placeholder="שם האורח"
            className="text-sm text-center border-none bg-transparent font-bold w-24"
            style={{ cursor: "pointer" }}
          />

          {/* tiny badge for last SMS */}
          <div
            className="flex items-center gap-1 text-[12px] font-normal text-gray-600"
            title={
              lastSmsAt
                ? `נשלח: ${new Date(lastSmsAt).toLocaleString()}`
                : "לא נשלח SMS"
            }
          >
            <Send size={14} className="opacity-70" />
            {lastSmsAt ? (
              <span>נשלח: {new Date(lastSmsAt).toLocaleString()}</span>
            ) : (
              <span className="text-gray-400">ללא SMS</span>
            )}
          </div>
        </div>

        {/* טלפון */}
        <div className="flex items-center gap-1">
          <Phone size={18} />
          <input
            type="text"
            readOnly
            value={guest.phone}
            placeholder="0501234567"
            className={`text-sm text-center border-none bg-transparent font-bold w-28 ${
              phoneError ? "border border-red-500" : ""
            }`}
            style={{ cursor: "pointer" }}
          />
        </div>

        {/* סטטוס */}
        <div className="flex items-center gap-0.5">
          <StatusBadge status={guest.status} />
        </div>

        {/* כמות */}
        <div className="flex items-center gap-0.5">
          {guest.status === "בא" ? (
            <>
              <div className="hidden md:inline-block px-1 text-gray-600 text-sm whitespace-nowrap">
                עם כמות משתתפים של
              </div>
              <Users size={18} />
              <input
                type="number"
                readOnly
                value={guest.count ?? ""}
                className="text-center border-none bg-transparent w-10"
                style={{ cursor: "pointer" }}
              />
            </>
          ) : (
            <div className="text-gray-400">–</div>
          )}
        </div>

        {/* שולחן */}
        <div className="flex items-center gap-1">
          <UtensilsCrossed size={18} />
          {guest.status === "בא" ? (
            <TableBadge
              tableNumber={Number(guest.table)}
              freeSeats={Number(availableSeats)}
            />
          ) : (
            <div className="bg-gray-100 text-gray-500 text-sm italic px-3 py-1 rounded-full min-w-[80px] text-center shadow whitespace-nowrap">
              ללא שולחן
            </div>
          )}
        </div>

        {/* שלח SMS */}
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation(); // prevent triggering onEdit
            onSendSms?.(guest);
          }}
          className="text-blue-600 hover:bg-blue-600 hover:text-white p-2 rounded-full transition-colors duration-200 mr-2"
          style={{ cursor: "pointer" }}
          title="שלח הודעת SMS"
          aria-label="שלח הודעת SMS"
        >
          <Send size={16} />
        </button>
      </div>
    </div>
  );
};

export default GuestItem;
