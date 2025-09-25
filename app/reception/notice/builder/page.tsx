// app/reception/notice/builder/page.tsx
"use client";

import { useMemo, useState } from "react";
import ReceptionNotice from "../../../components/ReceptionNotice";

function enc(s: string) {
  return encodeURIComponent(s || "");
}

export default function BuilderPage() {
  const [title, setTitle] = useState("ברוכים הבאים לחתונת נועה & תום");
  const [subtitle, setSubtitle] = useState(
    "קבלת פנים עד 19:30 • חופה ב-20:00 • Wi-Fi: HALL-Guest / 12345678"
  );
  const [bulletsText, setBulletsText] = useState(
    [
      "עמדת מתנות ליד הכניסה",
      "שירותים מימין למעלית",
      "נא לשמור את המעבר לאולם פנוי",
    ].join("\n")
  );
  const [qrSrc, setQrSrc] = useState("");

  const bullets = useMemo(
    () =>
      bulletsText
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean),
    [bulletsText]
  );

  const url = useMemo(() => {
    const base = "/reception/notice";
    const qs = [
      `title=${enc(title)}`,
      subtitle ? `subtitle=${enc(subtitle)}` : "",
      qrSrc ? `qrSrc=${enc(qrSrc)}` : "",
      ...bullets.map((b) => `b=${enc(b)}`),
    ]
      .filter(Boolean)
      .join("&");
    return `${base}?${qs}`;
  }, [title, subtitle, bullets, qrSrc]);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      alert("הקישור הועתק ✔️");
    } catch {
      alert("לא הצלחנו להעתיק. נא לסמן ולהעתיק ידנית.");
    }
  };

  return (
    <div
      dir="rtl"
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 py-6"
    >
      <h1 className="text-2xl font-bold text-blue-800 mb-4">
        בונה קישור למסך ברכה
      </h1>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* טופס */}
        <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
          <label className="block mb-2 text-sm font-semibold text-blue-900">
            כותרת
          </label>
          <input
            className="w-full border rounded-lg p-2 mb-4"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />

          <label className="block mb-2 text-sm font-semibold text-blue-900">
            תת-כותרת / לו״ז קצר
          </label>
          <input
            className="w-full border rounded-lg p-2 mb-4"
            value={subtitle}
            onChange={(e) => setSubtitle(e.target.value)}
          />

          <label className="block mb-2 text-sm font-semibold text-blue-900">
            נקודות (שורה לכל נקודה)
          </label>
          <textarea
            className="w-full border rounded-lg p-2 mb-4 h-28"
            value={bulletsText}
            onChange={(e) => setBulletsText(e.target.value)}
          />

          <label className="block mb-2 text-sm font-semibold text-blue-900">
            QR (אופציונלי, כתובת תמונה ציבורית)
          </label>
          <input
            className="w-full border rounded-lg p-2 mb-4"
            value={qrSrc}
            onChange={(e) => setQrSrc(e.target.value)}
            placeholder="/images/qr.png"
          />

          <div className="flex items-center gap-2">
            <input
              className="flex-1 border rounded-lg p-2"
              value={url}
              readOnly
            />
            <button
              onClick={copy}
              className="rounded-xl border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50"
            >
              העתק קישור
            </button>
          </div>
        </div>

        {/* פריוויו חי */}
        <div className="bg-white rounded-xl border border-blue-200 p-3 shadow-sm">
          <ReceptionNotice
            title={title}
            subtitle={subtitle}
            bullets={bullets}
            qrSrc={qrSrc}
          />
        </div>
      </div>
    </div>
  );
}

// how to use
{
  /* <ReceptionNotice
  title="ברוכים הבאים לחתונת נועה & תום"
  subtitle="קבלת פנים עד 19:30 • חופה ב-20:00 • Wi-Fi: HALL-Guest / 12345678"
  bullets={[
    "עמדת מתנות נמצאת מימין לכניסה",
    "שירותים משמאל, ליד המעלית",
    "אנא שמרו את המעבר לאולם פנוי",
  ]}
// qrSrc="/images/qr-waze.png" // אופציונלי, אם יש QR מוכן ב-public
/> */
}
