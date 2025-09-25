import React from "react";
import { Button } from "./ui/button";

interface TableListToolbarProps {
  onAddTable: () => void;
  toggleShortView: () => void;
  shortView: boolean;
  successMessage?: string; // 🟧 הוספת prop חדש לקבלת הודעת הצלחה
}

const TableListToolbar = ({
  onAddTable,
  toggleShortView,
  shortView,
  successMessage, // 🟧 קבלת ההודעה ב־props
}: TableListToolbarProps) => {
  return (
    <div className="w-full">
      <div className="flex justify-start m-2 gap-2">
        <Button
          onClick={onAddTable}
          style={{ cursor: "pointer" }}
          className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-4 py-2"
        >
          הוסף שולחן
        </Button>

        <Button
          onClick={toggleShortView}
          style={{ cursor: "pointer" }}
          className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm px-4 py-2"
        >
          {shortView ? "עבור לתצוגה מלאה" : "עבור לתצוגה מקוצרת"}
        </Button>
      </div>
      {/* הצגת ההודעה מעל הכפתורים אם קיימת */}
      {successMessage && (
        <div
          className="bg-green-100 text-green-800 px-4 py-2 rounded mb-2 text-sm text-right shadow"
          dir="rtl"
        >
          {successMessage}
        </div>
      )}
    </div>
  );
};

export default TableListToolbar;
