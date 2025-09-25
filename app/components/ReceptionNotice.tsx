// components/ReceptionNotice.tsx
"use client";

import { Maximize2, Minimize2 } from "lucide-react";
import Image from "next/image";
import React from "react";

type Props = {
  title: string; // כותרת גדולה (ברוכים הבאים...)
  subtitle?: string; // תת-כותרת/לו"ז קצר
  bullets?: string[]; // נקודות הנחיה קצרות
  qrSrc?: string; // (אופציונלי) QR ל-Waze/מפה/דף הנחיות
};

export default function ReceptionNotice({
  title,
  subtitle,
  bullets = [],
  qrSrc,
}: Props) {
  const ref = React.useRef<HTMLDivElement>(null);
  const [fs, setFs] = React.useState(false);

  const toggleFullscreen = async () => {
    try {
      if (!document.fullscreenElement) {
        await ref.current?.requestFullscreen();
        setFs(true);
      } else {
        await document.exitFullscreen();
        setFs(false);
      }
    } catch {}
  };

  return (
    <section
      ref={ref}
      dir="rtl"
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 mt-5 mb-10 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px]"
      aria-label="מסך ברכה והנחיות לאורחים"
    >
      <div className="flex items-center justify-between py-3">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-700">
          {title}
        </h2>
        <button
          onClick={toggleFullscreen}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition"
        >
          {fs ? (
            <Minimize2 className="w-4 h-4" />
          ) : (
            <Maximize2 className="w-4 h-4" />
          )}
          {fs ? "יציאה ממסך מלא" : "מסך מלא"}
        </button>
      </div>

      {subtitle && (
        <p className="text-lg sm:text-xl text-gray-700 mb-4">{subtitle}</p>
      )}

      {/* במקום ה-div הקיים של התוכן */}
      <div
        className={
          "flex gap-6 " +
          (fs
            ? "flex-col items-center text-center" // במסך מלא: מרכז אנכי, טקסט באמצע
            : "flex-col md:flex-row items-start") // רגיל: טקסט מימין, QR משמאל
        }
      >
        <div className={fs ? "flex-1 max-w-3xl" : "flex-1"}>
          <ul
            className={
              "list-disc pr-5 space-y-2 text-base sm:text-lg " +
              (fs ? "list-inside" : "")
            }
          >
            {bullets.map((b, i) => (
              <li key={i}>{b}</li>
            ))}
          </ul>
        </div>

        {qrSrc && (
          <div className={fs ? "mt-2" : ""}>
            <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-3 mx-auto">
              <Image
                src={qrSrc}
                alt="קוד QR להנחיות/ניווט"
                width={180}
                height={180}
                className="object-contain"
              />
              <p className="text-center text-xs text-gray-500 mt-2">
                סרקו לקבלת ניווט/מידע
              </p>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
