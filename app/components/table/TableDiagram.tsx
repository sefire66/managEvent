// TableDiagram.tsx
import { ChairIcon } from "./ChairIcon";
import { AvailabilityBadge } from "./AvailabilityBadge";
import type { Table } from "../../types/types";

export const TableDiagram = ({
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
    <div className="flex flex-col items-center mt-3">
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
