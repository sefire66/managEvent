"use client";

import React from "react";
import {
  Phone,
  User,
  Users,
  UtensilsCrossed,
  ArrowDown,
  ArrowUp,
  MessageSquare,
} from "lucide-react";
import type { Guest } from "../types/types";

interface FilterState {
  name: string;
  phone: string;
  status: string;
  count: string;
  table: string;
}

type Props = {
  filters: FilterState;
  setFilters: (filters: FilterState) => void;
  sortField: keyof Guest;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof Guest) => void;
  className?: string;
};

const SortIconButton = ({
  active,
  dir,
  onClick,
  label,
}: {
  active: boolean;
  dir: "asc" | "desc";
  onClick: () => void;
  label: string;
}) => (
  <button
    type="button"
    title={`מיון לפי ${label}`}
    aria-label={`מיון לפי ${label}`}
    onClick={onClick}
    className="absolute right-1 top-1/2 -translate-y-1/2 p-1 rounded hover:bg-gray-100 cursor-pointer"
  >
    {active ? (
      dir === "asc" ? (
        <ArrowUp size={14} />
      ) : (
        <ArrowDown size={14} />
      )
    ) : (
      <ArrowUp size={14} className="opacity-30" />
    )}
  </button>
);

export default function GuestListFilter({
  filters,
  setFilters,
  sortField,
  sortOrder,
  onSort,
  className = "",
}: Props) {
  const handleChange = (field: keyof FilterState, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const clearFilters = () => {
    setFilters({ name: "", phone: "", status: "", count: "", table: "" });
  };

  return (
    <div
      className={`w-full bg-white border rounded-2xl shadow p-3 ${className}`}
      dir="rtl"
    >
      <div className="flex flex-wrap gap-2 items-end">
        {/* Name */}
        <div className="relative shrink-0">
          <input
            className="border rounded p-2 pr-7 w-[160px] text-xs text-right"
            placeholder="שם"
            value={filters.name}
            onChange={(e) => handleChange("name", e.target.value)}
          />
          <SortIconButton
            active={sortField === "name"}
            dir={sortOrder}
            onClick={() => onSort("name")}
            label="שם"
          />
        </div>

        {/* Phone */}
        <div className="relative shrink-0">
          <input
            className="border rounded p-2 pr-7 w-[140px] text-xs text-right"
            placeholder="050…"
            value={filters.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
          />
          <SortIconButton
            active={sortField === "phone"}
            dir={sortOrder}
            onClick={() => onSort("phone")}
            label="טלפון"
          />
        </div>

        {/* Status (select + כפתור מיון צמוד, לא פנימי כדי לא להסתיר את החץ של הסלקט) */}
        <div className="shrink-0 inline-flex items-center gap-1">
          <select
            className="border rounded p-2 w-[120px] text-xs text-right"
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
          >
            <option value="">סטטוס</option>
            <option value="בא">בא</option>
            <option value="לא בא">לא בא</option>
            <option value="אולי בא">אולי בא</option>
            <option value="לא ענה">לא ענה</option>
          </select>
          <button
            type="button"
            title="מיון לפי סטטוס"
            aria-label="מיון לפי סטטוס"
            onClick={() => onSort("status")}
            className="p-1 rounded hover:bg-gray-100 cursor-pointer"
          >
            {sortField === "status" ? (
              sortOrder === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )
            ) : (
              <ArrowUp size={14} className="opacity-30" />
            )}
          </button>
        </div>

        {/* Count */}
        <div className="relative shrink-0">
          <input
            type="number"
            className="border rounded p-2 pr-7 w-[90px] text-xs text-center"
            placeholder="כמות"
            value={filters.count}
            onChange={(e) =>
              handleChange("count", e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <SortIconButton
            active={sortField === "count"}
            dir={sortOrder}
            onClick={() => onSort("count")}
            label="כמות"
          />
        </div>

        {/* Table */}
        <div className="relative shrink-0">
          <input
            type="number"
            className="border rounded p-2 pr-7 w-[90px] text-xs text-center"
            placeholder="שולחן"
            value={filters.table}
            onChange={(e) =>
              handleChange("table", e.target.value.replace(/\D/g, ""))
            }
            inputMode="numeric"
            pattern="[0-9]*"
          />
          <SortIconButton
            active={sortField === "table"}
            dir={sortOrder}
            onClick={() => onSort("table")}
            label="שולחן"
          />
        </div>

        {/* Last SMS (מיון בלבד) */}
        <div className="shrink-0">
          <button
            type="button"
            className="inline-flex items-center gap-1 px-2 py-2 border rounded text-xs hover:bg-gray-50 cursor-pointer"
            title="מיון לפי SMS"
            aria-label="מיון לפי SMS"
            onClick={() => onSort("lastSms")}
          >
            <MessageSquare size={14} />
            SMS
            {sortField === "lastSms" ? (
              sortOrder === "asc" ? (
                <ArrowUp size={14} />
              ) : (
                <ArrowDown size={14} />
              )
            ) : (
              <ArrowUp size={14} className="opacity-30" />
            )}
          </button>
        </div>

        {/* נקה סינון – באותה שורה */}
        <div className="shrink-0">
          <button
            type="button"
            className="px-3 py-2 bg-gray-100 hover:bg-gray-200 rounded text-xs cursor-pointer"
            onClick={clearFilters}
            title="נקה סינון"
            aria-label="נקה סינון"
          >
            נקה סינון
          </button>
        </div>
      </div>
    </div>
  );
}
