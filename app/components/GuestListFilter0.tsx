"use client";

import React from "react";
import {
  Phone,
  User,
  Users,
  UtensilsCrossed,
  ArrowDown,
  ArrowUp,
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
};

const GuestListFilter = ({
  filters,
  setFilters,
  sortField,
  sortOrder,
  onSort,
}: Props) => {
  const handleChange = (field: keyof FilterState, value: string) => {
    setFilters({ ...filters, [field]: value });
  };

  const renderSortButton = (field: keyof Guest) => (
    <button onClick={() => onSort(field)} className="ml-1 text-gray-600">
      {sortField === field ? (
        sortOrder === "asc" ? (
          <ArrowUp size={14} />
        ) : (
          <ArrowDown size={14} />
        )
      ) : (
        <ArrowUp size={14} className="opacity-30" />
      )}
    </button>
  );

  const clearFilters = () => {
    setFilters({
      name: "",
      phone: "",
      status: "",
      count: "",
      table: "",
    });
  };

  return (
    <div className="flex flex-row items-start border py-2 px-2 bg-gray-50 rounded mb-4 w-full">
      <div className="flex flex-wrap gap-4 items-center w-full">
        {/* Name */}
        <div className="flex items-center">
          <User size={18} className="ml-1" />
          <input
            placeholder="חפש שם"
            value={filters.name}
            onChange={(e) => handleChange("name", e.target.value)}
            className="px-2 py-1 rounded text-sm w-24"
          />
          {renderSortButton("name")}
        </div>

        {/* Status */}
        <div className="flex items-center">
          <select
            value={filters.status}
            onChange={(e) => handleChange("status", e.target.value)}
            className="px-2 py-1 rounded text-sm w-24"
          >
            <option value="">סטטוס</option>
            <option value="בא">בא</option>
            <option value="לא בא">לא בא</option>
            <option value="אולי בא">אולי בא</option>
            <option value="לא ענה">לא ענה</option>
          </select>
          {renderSortButton("status")}
        </div>

        {/* Count */}
        <div className="flex items-center">
          <Users size={18} className="ml-1" />
          <input
            placeholder="כמות"
            value={filters.count}
            onChange={(e) => handleChange("count", e.target.value)}
            className="px-2 py-1 rounded text-sm w-16"
          />
          {renderSortButton("count")}
        </div>

        {/* Table */}
        <div className="flex items-center">
          <UtensilsCrossed size={18} className="ml-1" />
          <input
            placeholder="שולחן"
            value={filters.table}
            onChange={(e) => handleChange("table", e.target.value)}
            className="px-2 py-1 rounded text-sm w-16"
          />
          {renderSortButton("table")}
        </div>

        {/* Phone */}
        <div className="flex items-center">
          <Phone size={18} className="ml-1" />
          <input
            placeholder="050..."
            value={filters.phone}
            onChange={(e) => handleChange("phone", e.target.value)}
            className="px-2 py-1 rounded text-sm w-28"
          />
          {renderSortButton("phone")}
        </div>

        {/* Clear button */}
        <div className="ml-auto">
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:underline"
          >
            נקה
          </button>
        </div>
      </div>
    </div>
  );
};

export default GuestListFilter;
