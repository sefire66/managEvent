import React from "react";
import type { Guest, Table } from "../types/types";
import { getOccupiedSeats } from "../utilityFunctions/tableFunctions";
import Stat from "./Stat";

interface TableDashboardProps {
  tables: Table[];
  guests: Guest[];
}

const TableDashboard = ({ tables, guests }: TableDashboardProps) => {
  const safeGuests = Array.isArray(guests) ? guests : [];
  const safeTables = Array.isArray(tables) ? tables : [];
  const totalTables = safeTables.length;
  const totalSeats = safeTables.reduce((sum, t) => sum + t.totalSeats, 0);
  const totalGuests = safeGuests.reduce((sum, g) => sum + (g.count || 0), 0);
  const totalOccupied = safeTables.reduce(
    (sum, table) => sum + getOccupiedSeats(guests, table.number),
    0
  );
  const totalAvailable = totalSeats - totalGuests;
  const overflowTables = safeTables.filter(
    (t) => getOccupiedSeats(safeGuests, t.number) > t.totalSeats
  ).length;

  const missingSeats = totalAvailable < 0 ? Math.abs(totalAvailable) : 0;

  // const Stat = ({
  //   icon,
  //   label,
  //   value,
  //   color,
  // }: {
  //   icon: string;
  //   label: string;
  //   value: number;
  //   color: string;
  // }) => (
  //   <div className="flex items-center space-x-2 text-sm font-medium">
  //     <span>{icon}</span>
  //     <span>{label}:</span>
  //     <span className={`font-bold text-${color}-600`}>{value}</span>
  //   </div>
  // );

  return (
    <div className="bg-gray-50 border border-gray-200 rounded-md p-2 text-sm text-gray-700 font-semibold grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-x-2 gap-y-2 text-right ">
      <Stat icon="🛋️" label="סהכ שולחנות" value={totalTables} color="blue" />
      <Stat icon="🪑" label="סהכ מקומות" value={totalSeats} color="gray" />
      <Stat icon="👥" label="סהכ מוזמנים" value={totalGuests} color="green" />
      <Stat
        icon="❌"
        label="מקומות תפוסים"
        value={totalOccupied}
        color="gray"
      />
      <Stat
        icon="⚠️"
        label="שולחנות בחריגה"
        value={overflowTables}
        color="red"
      />
      <Stat icon="🔻" label="מקומות חסרים" value={missingSeats} color="red" />
    </div>
  );
};

export default TableDashboard;
