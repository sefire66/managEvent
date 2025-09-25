// TableGuestList.tsx
import type { Guest } from "../../types/types";

export const TableGuestList = ({ guests }: { guests: Guest[] }) => (
  <div className="text-xs text-right w-25">
    {guests.length > 0 ? (
      <ul className="space-y-1">
        {guests.map((g) => (
          <li key={g._id} className="flex items-center text-[13px] ml-[10px]">
            <span className="truncate">{g.name}</span>
            <span className="text-gray-500 text-[13px] font-bold mr-[5px]">
              ×{g.count || 1}
            </span>
          </li>
        ))}
      </ul>
    ) : (
      <div className="text-gray-400 text-[11px]">אין אורחים בשולחן</div>
    )}
  </div>
);
