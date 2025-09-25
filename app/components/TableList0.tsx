import React from "react";
// import TableItem from "./table/TableItem";
import TableItem from "./TableItem";

import type { Table, Guest } from "../types/types";
import TableListToolbar from "./TableListToolbar";

interface TableListProps {
  tables: Table[];
  guests: Guest[];
  onEditTable: (table: Table) => void;
  onAddTable: () => void;
  shortView: boolean;
  toggleShortView: () => void;
  onGuestClick: (guest: Guest) => void; // ✅ add this
}

const TableList = ({
  tables,
  guests,
  onEditTable,
  onAddTable,
  shortView,
  toggleShortView,
}: TableListProps) => {
  return (
    <div className="border-2 ">
      <div className="flex flex-row items-center  p-2 border m-2" dir="rtl">
        <TableListToolbar
          onAddTable={onAddTable}
          toggleShortView={toggleShortView}
          shortView={shortView}
        />
      </div>

      <div
        className="max-h-[500px] overflow-y-auto"
        style={{ direction: "ltr" }}
      >
        <div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 gap-4  p-4"
          style={{ direction: "rtl" }}
        >
          {tables.map((table) => {
            console.log("🔍 Table number:", table.number);
            console.log(
              "📋 Guests at this table:",

              guests.filter((g) => g.table === table.number)
            );

            return (
              <TableItem
                key={table.number}
                table={table}
                guests={guests}
                onEdit={onEditTable}
                shortView={shortView} // ⬅️ העברת הפרופ
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default TableList;
