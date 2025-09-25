// components/IntegrationsSection.tsx
"use client";

import React from "react";
import {
  MessageSquareText,
  FileSpreadsheet,
  MapPin,
  QrCode,
  CalendarClock,
  Link2,
  Webhook,
  Lock,
  Ban,
} from "lucide-react";

function Card({
  icon,
  title,
  children,
  disabled = false,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
  disabled?: boolean;
}) {
  return (
    <article
      className={[
        "bg-white rounded-2xl shadow p-5 h-full border",
        disabled ? "border-gray-200 opacity-60" : "border-blue-200",
      ].join(" ")}
      aria-disabled={disabled}
    >
      <div className="flex items-start gap-3">
        <div
          className={[
            "flex items-center justify-center w-10 h-10 rounded-xl border shrink-0",
            disabled
              ? "bg-gray-50 border-gray-200"
              : "bg-blue-50 border-blue-200",
          ].join(" ")}
        >
          {icon}
        </div>
        <div className="flex-1">
          <h4 className="text-base sm:text-lg font-bold text-blue-900 mb-1">
            {title}
          </h4>
          <div className="text-sm sm:text-base text-gray-700 leading-7">
            {children}
          </div>
        </div>
      </div>
    </article>
  );
}

export default function IntegrationsSection({
  className = "",
  showUpcoming = true, // הצגת כרטיסים של "בקרוב"
}: {
  className?: string;
  showUpcoming?: boolean;
}) {
  return (
    <section
      dir="rtl"
      className={`mt-6 max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px] ${className}`}
      aria-label="אינטגרציות"
    >
      <div className="text-center md:text-right mb-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-blue-800">
          אינטגרציות
        </h3>
        <p className="text-gray-700 mt-1 text-sm sm:text-base">
          חיבורים שימושיים להפעלה חלקה של ההזמנות, הרשימות והמידע לאורחים — בלי
          כאב ראש.
        </p>
      </div>

      {/* קיים היום */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          icon={<MessageSquareText className="w-5 h-5 text-blue-700" />}
          title="ספק SMS"
        >
          שליחת הזמנות, תזכורות ו־אוטומציות <strong>ב-SMS בלבד</strong>. ניתן
          לעבוד מול ספק ברירת־מחדל או להגדיר Credentials לספק קיים (כפוף לתצורת
          המערכת).
        </Card>

        <Card
          icon={<FileSpreadsheet className="w-5 h-5 text-blue-700" />}
          title="ייבוא/ייצוא Excel & CSV"
        >
          ייבוא רשימת אורחים לפי <em>תבנית אקסל</em>, כולל אימות שדות בסיסי.
          ייצוא בכל רגע לקובץ CSV/Excel לצרכי גיבוי או עבודה חיצונית.
        </Card>

        <Card
          icon={<MapPin className="w-5 h-5 text-blue-700" />}
          title="קישורי מפות (Waze / Google Maps)"
        >
          הוספת קישורי ניווט לעמוד ההזמנה ולהודעות ה־SMS. האורחים מקבלים הוראות
          נסיעה בקליק.
        </Card>

        <Card
          icon={<QrCode className="w-5 h-5 text-blue-700" />}
          title="קודי QR (תצוגה/ניווט)"
        >
          יצירת/הצגת QR למסך ברכה, לניווט או לפרטי האירוע. מתאים לעמדת קבלה על
          אייפד/טאבלט או מסך גדול.
        </Card>

        <Card
          icon={<CalendarClock className="w-5 h-5 text-blue-700" />}
          title="קובץ iCal (הוספה ליומן)"
        >
          אפשרות לצרף/להציג קובץ <code>.ics</code> בעמוד ההזמנה כדי שהאורחים
          יוסיפו ליומן שלהם (Google/Apple/Outlook).
        </Card>

        <Card
          icon={<Link2 className="w-5 h-5 text-blue-700" />}
          title="קישורים קצרים"
        >
          תמיכה בהוספת <em>קישור קצר</em> ידני להודעות SMS, לשיפור חוויית הקריאה
          והמדידה (לפי הצורך).
        </Card>
      </div>

      {/* בקרוב / אופציונלי */}
      {showUpcoming && (
        <>
          <div className="my-6 h-px bg-gradient-to-r from-transparent via-blue-200/60 to-transparent" />
          <div className="text-blue-900 font-semibold mb-3">בקרוב</div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card
              disabled
              icon={<Webhook className="w-5 h-5 text-gray-500" />}
              title="Webhooks / Zapier"
            >
              טריגרים ליצוא אירועים (אורח חדש, אישור הגעה, ביטול) לחיבורים
              מותאמים כגון CRM או Google Sheets.
            </Card>

            <Card
              disabled
              icon={<Lock className="w-5 h-5 text-gray-500" />}
              title="SSO / הזדהות ארגונית"
            >
              חיבור זהויות ארגוניות (SSO) למנהלי אירועים בארגונים — בהתאם לצורך.
            </Card>

            <Card
              disabled
              icon={<Ban className="w-5 h-5 text-gray-500" />}
              title="תשלומים ומתנות"
            >
              מודול נפרד לקבלת תשלומים/מתנות אינו פעיל כרגע אצלכם. כשייפתח —
              יופיע כאן בתור אינטגרציה מונחית ספק.
            </Card>
          </div>
        </>
      )}
    </section>
  );
}
