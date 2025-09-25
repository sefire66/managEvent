"use client";

import React from "react";

interface GuestListToolbarProps {
  onAddGuest: () => void;
  onImportGuests: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onExportGuests: () => void;
  onToggleFilter: () => void;
  showFilter: boolean;
  onImportClick: () => void; // ✅ לחצן שמפעיל את הבדיקה והפתיחה
  inputRef: React.RefObject<HTMLInputElement | null>; // ✅ נכון - כולל nullה-ref ל-input
}

const GuestListToolbar = ({
  onAddGuest,
  onImportGuests,
  onExportGuests,
  onToggleFilter,
  showFilter,
  onImportClick,
  inputRef,
}: GuestListToolbarProps) => {
  return (
    <div className="w-full flex justify-center gap-4 flex-wrap mb-4 mt-2">
      <button
        onClick={onAddGuest}
        style={{ cursor: "pointer" }}
        className="bg-green-600 text-white px-4 py-2 rounded"
        title="הוספת אורח חדש"
      >
        הוסף אורח
      </button>
      <button
        onClick={onImportClick}
        style={{ cursor: "pointer" }}
        className="bg-yellow-500 text-white px-4 py-2 rounded"
        title="שים לב שהקובץ בתבנית מתאימה"
      >
        העלה קובץ Excel
      </button>
      <input
        type="file"
        accept=".xlsx, .xls"
        onChange={onImportGuests}
        className="hidden"
        ref={inputRef}
      />
      <button
        onClick={onExportGuests}
        style={{ cursor: "pointer" }}
        className="bg-blue-600 text-white px-4 py-2 rounded"
        title="ייצוא לשם גיבוי והוספה"
      >
        ייצא ל-Excel
      </button>
      <a
        href="/template_guest_list.xlsx"
        download="תבנית_רשימת_אורחים.xlsx"
        className="bg-gray-600 text-white px-4 py-2 rounded text-center"
        style={{ cursor: "pointer" }}
        title="עמודות שם וטלפון הם חובה, כל השאר אפשר למלא בהמשך"
      >
        הורד תבנית Excel
      </a>
      <button
        onClick={onToggleFilter}
        className="bg-purple-600 text-white px-4 py-2 rounded"
        style={{ cursor: "pointer" }}
        title="הצג/הסתר תפריט סינון"
      >
        {showFilter ? "הסתר סינון" : "סינון ומיון"}
      </button>
    </div>
  );
};

export default GuestListToolbar;
