// TableListToolbar.tsx
import React from "react";
import { Button } from "./ui/button";

interface TableListToolbarProps {
  onAddTable: () => void;
  toggleShortView: () => void;
  shortView: boolean;
}

const TableListToolbar = ({
  onAddTable,
  toggleShortView,
  shortView,
}: TableListToolbarProps) => {
  return (
    <div className="flex justify-end m-2 gap-2">
      <Button
        onClick={onAddTable}
        className="bg-blue-600 text-white hover:bg-blue-700 text-sm px-4 py-2"
      >
        הוסף שולחן
      </Button>

      <Button
        onClick={toggleShortView}
        className="bg-gray-200 text-gray-700 hover:bg-gray-300 text-sm px-4 py-2"
      >
        {shortView ? " עבור לתצוגה מלאה" : "עבור לתצוגה מקוצרת "}
      </Button>
    </div>
  );
};

export default TableListToolbar;
