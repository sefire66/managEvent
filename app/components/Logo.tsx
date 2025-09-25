"use client";

import React from "react";

export default function Logo() {
  return (
    <div className="flex justify-center">
      <div
        className="
          bg-blue-100 rounded-full shadow-md w-fit text-center
          py-0.5 px-2 sm:py-1 sm:px-3
          max-w-[55vw] sm:max-w-none
        "
        dir="ltr"
      >
        {/* שורת דומיין — קטנה יותר במובייל */}
        <div className="text-sm sm:text-md font-bold text-blue-800">
          managevent.co.il
        </div>

        {/* סלוגן — מוסתר במובייל, מוצג מ־sm ומעלה */}
        <div
          className="
            hidden sm:flex
            text-sm text-blue-700 font-medium mt-1
            items-center justify-center gap-1
          "
          dir="rtl"
        >
          <span>מארגנים</span>
          <span className="text-yellow-500">✨</span>
          <span>מאשרים</span>
          <span className="text-yellow-500">✨</span>
          <span>חוגגים</span>
        </div>
      </div>
    </div>
  );
}
