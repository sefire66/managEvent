"use client";

import React from "react";

export default function Logo() {
  return (
    <div className="flex justify-center ml-5">
      <div
        className="bg-blue-100 py-1 px-3 rounded-full shadow-md w-fit text-center whitespace-nowrap"
        dir="ltr"
      >
        <div className="text-md font-bold text-blue-800">managevent.co.il</div>
        <div
          className="text-sm text-blue-700 font-medium mt-1 flex items-center justify-center gap-1"
          dir="rtl"
        >
          <span>מארגנים</span>
          <span className="text-yellow-500">✨</span>
          <span>מאשרים</span>
        </div>
        {/* <span className="text-yellow-500">✨</span> */}
        <div className="text-sm text-blue-700 font-medium mt-1 flex items-center justify-center gap-1 text-center">
          חוגגים
        </div>
      </div>
    </div>
  );
}
