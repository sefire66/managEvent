"use client";

import React from "react";

type Props = {
  useBackground: boolean;
  setUseBackground: (value: boolean) => void;
};

const InvitationEdit = ({ useBackground, setUseBackground }: Props) => {
  return (
    <div className="w-full md:w-1/2 bg-white rounded-xl shadow-lg p-6 h-full flex flex-col justify-center border border-gray-200">
      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input
          type="checkbox"
          checked={useBackground}
          onChange={(e) => setUseBackground(e.target.checked)}
        />
        תמונת רקע להזמנה
      </label>
    </div>
  );
};

export default InvitationEdit;
