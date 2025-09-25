"use client";

import React from "react";
import type { Guest } from "../types/types";

interface GuestStatsProps {
  guestList: Guest[];
  filters: {
    name: string;
    phone: string;
    status: string;
    count: string;
    table: string;
  };
  setFilters: (filters: {
    name: string;
    phone: string;
    status: string;
    count: string;
    table: string;
  }) => void;
}

const GuestStats = ({ guestList, filters, setFilters }: GuestStatsProps) => {
  const safeGuestList = Array.isArray(guestList) ? guestList : [];
  const total = guestList.length;

  const totalCount = safeGuestList.reduce(
    (total, guest) => total + Number(guest.count || 0),
    0
  );
  const coming = safeGuestList.filter((g) => g.status === "בא").length;
  const maybe = safeGuestList.filter((g) => g.status === "אולי").length;
  const notComing = safeGuestList.filter((g) => g.status === "לא בא").length;
  const noReply = safeGuestList.filter((g) => g.status === "לא ענה").length;

  const handleStatusClick = (status: string) => {
    setFilters({ ...filters, status });
  };

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-xl shadow p-6 text-center grid grid-cols-2 sm:grid-cols-4 gap-4">
        <StatBox
          label="סהכ משפחות"
          value={total}
          onClick={() => handleStatusClick("")}
        />
        <StatBox
          label="סהכ מוזמנים"
          value={totalCount}
          onClick={() => handleStatusClick("")}
        />

        <StatBox
          label="מאשרים הגעה"
          value={coming}
          onClick={() => handleStatusClick("בא")}
        />

        <StatBox
          label="אולי יגיעו"
          value={maybe}
          onClick={() => handleStatusClick("אולי בא")}
        />
        <StatBox
          label="עדיין לא ענו"
          value={noReply}
          onClick={() => handleStatusClick("לא ענה")}
        />

        <StatBox
          label="לא מגיעים"
          value={notComing}
          onClick={() => handleStatusClick("לא בא")}
        />

        {/* <StatBox label="מאשרים הגעה" value={coming} />
        <StatBox label="אולי יגיעו" value={maybe} />
        <StatBox label="עדיין לא ענו" value={noReply} />
        <StatBox label="לא מגיעים" value={notComing} /> */}
      </div>

      {/* <div className="flex justify-center gap-2 flex-wrap">
        {[
          { label: "הכל", value: "" },
          { label: "בא", value: "בא" },
          { label: "אולי בא", value: "אולי בא" },
          { label: "לא בא", value: "לא בא" },
          { label: "לא ענה", value: "לא ענה" },
        ].map(({ label, value }) => (
          <button
            key={value}
            onClick={() => handleStatusClick(value)}
            className={`px-4 py-1 rounded-full border text-sm transition ${
              filters.status === value
                ? "bg-blue-600 text-white"
                : "bg-gray-100 text-gray-800"
            }`}
          >
            {label}
          </button>
        ))}
      </div> */}
    </div>
  );
};

const StatBox = ({
  label,
  value,
  onClick,
}: {
  label: string;
  value: number;
  onClick?: () => void; // optional click handler
}) => (
  <div onClick={onClick} className="bg-blue-100 rounded-lg p-4 cursor-pointer">
    <div className="text-2xl font-bold text-blue-800">{value}</div>
    <div className="text-sm text-blue-600 mt-1">{label}</div>
  </div>
);

export default GuestStats;
