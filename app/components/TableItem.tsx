import React from "react";
import type { Guest, Table } from "../types/types";
import {
  getOccupiedSeats,
  getAvailableSeats,
  getGuestsAtTable,
} from "../utilityFunctions/tableFunctions";

interface TableItemProps {
  table: Table;
  guests: Guest[];
  onEdit: (table: Table) => void;
  shortView: boolean;
  onGuestClick: (guest: Guest) => void;
}

//===========================================
// אייקון כיסא – ללא שינוי
const ChairIcon = ({ occupied }: { occupied: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill={occupied ? "#ef4444" : "#22c55e"}
    viewBox="0 0 24 24"
  >
    <path d="M6 2h12a1 1 0 0 1 1 1v2H5V3a1 1 0 0 1 1-1zm-1 5h14v3H5V7zm2 4h10v7a1 1 0 1 1-2 0v-5H9v5a1 1 0 1 1-2 0v-7z" />
  </svg>
);

//============================================
// תגית זמינות – ללא שינוי לוגי
const AvailabilityBadge = ({ available }: { available: number }) => {
  const absValue = Math.abs(available);

  if (available === 0) {
    return (
      <div className="bg-yellow-400 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        {absValue}
      </div>
    );
  } else if (available > 0) {
    return (
      <div className="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        {absValue}
      </div>
    );
  } else {
    return (
      <div className="bg-red-600 animate-pulse text-white text-lg font-extrabold rounded-full w-10 h-10 flex items-center justify-center">
        {absValue}
      </div>
    );
  }
};

//============================================
// דיאגרמת שולחן – ללא שינוי
const TableDiagram = ({
  table,
  occupied,
  available,
}: {
  table: Table;
  occupied: number;
  available: number;
}) => {
  const total = table.totalSeats;
  const chairIcons = Array.from({ length: total }).map((_, index) => (
    <ChairIcon key={index} occupied={index < occupied} />
  ));
  const chairsPerSide = Math.ceil(total / 4);

  return (
    <div className="flex flex-col items-center mt-3 hover:scale-103 transition-transform duration-300 ">
      <div className="flex gap-1 mb-1">
        {chairIcons.slice(0, chairsPerSide)}
      </div>

      <div className="flex gap-1 relative">
        <div className="flex flex-col gap-1">
          {chairIcons.slice(chairsPerSide, chairsPerSide * 2)}
        </div>

        <div className="w-16 h-16 bg-gray-200 rounded flex flex-col items-center justify-center text-xs font-bold relative">
          <div className="absolute top-1 inset-x-0 flex justify-center">
            <AvailabilityBadge available={available} />
          </div>
          <div className="mt-4">שולחן {table.number}</div>
          {available < 0 && (
            <div className="text-[14px] text-red-600 font-bold mt-1">חריגה</div>
          )}
        </div>

        <div className="flex flex-col gap-1">
          {chairIcons.slice(chairsPerSide * 2, chairsPerSide * 3)}
        </div>
      </div>

      <div className="flex gap-1 mt-1">
        {chairIcons.slice(chairsPerSide * 3, total)}
      </div>
    </div>
  );
};

//============================================
// רשימת אורחים – תומכת בשתי פריסות (inline / טור)
const TableGuestList = ({
  guests,
  onGuestClick,
  inline = false,
}: {
  guests: Guest[];
  onGuestClick: (guest: Guest) => void;
  inline?: boolean;
}) => (
  <div className={`text-xs text-right ${inline ? "w-full" : "w-full"} `}>
    {guests.length > 0 ? (
      <>
        {inline ? (
          <div className="flex flex-wrap  gap-1">
            {guests
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "he"))
              .map((g) => (
                <div
                  key={g._id}
                  className="flex items-center text-[14px]  px-2 py-0.5 rounded cursor-pointer hover:bg-blue-50 hover:scale-105 hover:font-bolt"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGuestClick(g);
                  }}
                  title={g.name}
                >
                  <span className="truncate max-w-[10rem] ">{g.name}</span>
                  <span className="text-gray-500 text-[14px] font-bold mr-[5px]">
                    ×{g.count || 1}
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <ul className="space-y-1">
            {guests
              .slice()
              .sort((a, b) => a.name.localeCompare(b.name, "he"))
              .map((g) => (
                <li
                  key={g._id}
                  className="flex items-center text-[14px] ml-[10px] hover:scale-105 hover:bg-blue-50 hover:font-bolt"
                  onClick={(e) => {
                    e.stopPropagation();
                    onGuestClick(g);
                  }}
                  title={g.name}
                >
                  <span className="truncate">{g.name}</span>
                  <span className="text-gray-500 text-[14px] font-bold mr-[5px]">
                    ×{g.count || 1}
                  </span>
                </li>
              ))}
          </ul>
        )}
      </>
    ) : (
      <div className="text-gray-400 text-[11px]">אין אורחים בשולחן</div>
    )}
  </div>
);

//============================================
// פריט שולחן – מתוח לגובה ומיושר מהחלק העליון
const TableItem = ({
  table,
  guests,
  onEdit,
  shortView,
  onGuestClick,
}: TableItemProps) => {
  const guestsAtTable = getGuestsAtTable(guests, String(table.number));
  const occupied = getOccupiedSeats(guests, String(table.number));
  const available = getAvailableSeats(table, guests);
  const isFull = available < 0; // אם תרצה "רק כשבאפס" אז available === 0
  return (
    <div
      className="h-full w-full min-w-0 border rounded-lg p-3 shadow-sm bg-white  flex flex-col space-y-2 "
      // 🟧 הכרטיס עצמו: h-full + flex-col כדי להתמתח ולשמור שהתוכן יתחיל מלמעלה
      style={{ direction: "rtl", cursor: "pointer" }}
    >
      {/* כותרת השולחן – לחיצה פותחת עריכה */}
      <div className="text-right space-y-1" onClick={() => onEdit(table)}>
        <div className="flex flex-col cursor-pointer sm:flex-row sm:items-center sm:justify-between text-sm font-semibold hover:scale-101 hover:bg-blue-50 transition-transform duration-300 ">
          <span className={isFull ? "text-red-800" : "text-blue-800"}>
            שולחן {table.number} ({table.totalSeats} מושבים)
          </span>
          <span className="text-xs font-normal text-gray-600">
            תפוסים:{" "}
            <span className="font-semibold text-red-600">{occupied}</span> —
            {available < 0 ? (
              <span className="text-orange-500 font-semibold flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 fill-orange-500"
                  viewBox="0 0 24 24"
                >
                  <path d="M1 21h22L12 2 1 21zm13-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
                {Math.abs(available)} <span>חריגה</span>
              </span>
            ) : (
              <span
                className={
                  available === 0
                    ? "text-yellow-600 font-semibold"
                    : "text-green-600 font-semibold"
                }
              >
                {available} פנויים
              </span>
            )}
          </span>
        </div>

        {table.note && (
          <div className="text-xs text-yellow-700 italic">
            הערה: {table.note}
          </div>
        )}

        {/* במצב shortView – מציגים את רשימת האורחים (אופקית) בתוך הכותרת */}
        {shortView && (
          <div
            className="mt-2 pt-2 border-t cursor-default"
            onClick={(e) => e.stopPropagation()}
          >
            <TableGuestList
              guests={guestsAtTable}
              onGuestClick={onGuestClick}
              inline
            />
          </div>
        )}
      </div>

      {/* במצב מלא – מציגים גם דיאגרמה וגם רשימת אורחים בטור */}
      {!shortView && (
        <div
          className="flex items-start gap-4 justify-start"
          // 🟧 הורדתי mt-auto והחלפתי justify-center ב-justify-start
          //     כדי שהבלוק התחתון לא יידחף למטה ויישאר “מחובר” לעליון (התחלה מלמעלה)
          onClick={() => onEdit(table)}
        >
          <TableGuestList guests={guestsAtTable} onGuestClick={onGuestClick} />
          <TableDiagram
            table={table}
            occupied={occupied}
            available={available}
          />
        </div>
      )}
    </div>
  );
};

export default TableItem;
