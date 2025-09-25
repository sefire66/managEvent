// GuestListDashboard.tsx
import React from "react";
import type { Guest } from "../types/types";
import Stat from "./Stat";

interface GuestListDashboardProps {
  guestList: Guest[];
}

const GuestListDashboard = ({ guestList }: GuestListDashboardProps) => {
  const safeGuestList = Array.isArray(guestList) ? guestList : [];
  const totalFamilies = safeGuestList.length;

  const totalInvited = safeGuestList.reduce(
    (total, guest) => total + Number(guest.count || 0),
    0
  );
  const coming = safeGuestList.filter((g) => g.status === "בא").length;
  const maybe = safeGuestList.filter((g) => g.status === "אולי").length;
  const notComing = safeGuestList.filter((g) => g.status === "לא בא").length;
  const noReply = safeGuestList.filter((g) => g.status === "לא ענה").length;

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
    <div className="bg-gray-50 border border-gray-200 rounded-md p-1 text-sm text-gray-700 font-semibold grid grid-cols-3 sm:grid-cols-3 md:grid-cols-3 gap-x-1 gap-y-2 text-right w-full">
      <Stat icon="👥" label="סהכ משפחות" value={totalFamilies} color="blue" />
      <Stat icon="🎟️" label="אישרו הגעה" value={totalInvited} color="gray" />
      <Stat icon="✅" label="משפ מגיעות" value={coming} color="green" />
      <Stat icon="❓" label="אולי" value={maybe} color="yellow" />
      <Stat icon="📞" label="לא ענו" value={noReply} color="gray" />
      <Stat icon="❌" label="לא בא" value={notComing} color="red" />
    </div>
  );
};

export default GuestListDashboard;
