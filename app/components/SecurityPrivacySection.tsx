// components/SecurityPrivacySection.tsx
"use client";

import React from "react";
import {
  ShieldCheck,
  Lock,
  KeyRound,
  EyeOff,
  Database,
  Server,
  FileCheck,
  Trash2,
  Clock,
  Globe,
  Info,
} from "lucide-react";
import Link from "next/link";

function Card({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <article className="bg-white border border-blue-200 rounded-2xl shadow p-5 h-full">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 shrink-0">
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

export default function SecurityPrivacySection({
  className = "",
  lastUpdated = "",
  dpaHref = "/contactus", // דוגמה: דף יצירת קשר לקבלת הסכם עיבוד נתונים
  privacyHref = "/privacy", // דוגמה: מדיניות פרטיות
}: {
  className?: string;
  lastUpdated?: string;
  dpaHref?: string;
  privacyHref?: string;
}) {
  const [more, setMore] = React.useState(false);

  return (
    <section
      dir="rtl"
      className={`mt-6 max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px] ${className}`}
      aria-label="אבטחה ופרטיות"
    >
      <div className="text-center md:text-right mb-4">
        <h3 className="text-2xl sm:text-3xl font-bold text-blue-800">
          אבטחה ופרטיות
        </h3>
        <p className="text-gray-700 mt-1 text-sm sm:text-base">
          אנו שומרים על נתוני האורחים והאירועים שלכם בסביבה מאובטחת ומוגנת,
          ומאפשרים שליטה מלאה על המידע.
        </p>
        {lastUpdated && (
          <p className="mt-1 text-xs text-gray-500 flex items-center gap-1 justify-center md:justify-start">
            <Clock className="w-3.5 h-3.5" /> עודכן לאחרונה: {lastUpdated}
          </p>
        )}
      </div>

      {/* כרטיסים – אחד מתחת לשני במסכים צרים, גריד במסכים רחבים */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card
          icon={<ShieldCheck className="w-5 h-5 text-blue-700" />}
          title="הגנות ברירת מחדל"
        >
          <ul className="list-disc pr-5 space-y-1">
            <li>תקשורת מוצפנת (HTTPS/TLS) לכל הדפים ופעולות המערכת.</li>
            <li>מדיניות הרשאות לפי תפקיד (Role-Based), גישה למארגנים בלבד.</li>
            <li>
              בקרות בסיסיות נגד ניסיונות זדוניים (Rate Limit / Throttling).
            </li>
          </ul>
        </Card>

        <Card
          icon={<Lock className="w-5 h-5 text-blue-700" />}
          title="הצפנה ושמירת נתונים"
        >
          <ul className="list-disc pr-5 space-y-1">
            <li>הצפנה בתעבורה (in-transit) והקשחת גישה למסדי הנתונים.</li>
            <li>הפרדה בין סביבת בדיקות/פיתוח לסביבת ייצור.</li>
            <li>גיבויים סדירים ושחזור על פי צורך תפעולי.</li>
          </ul>
        </Card>

        <Card
          icon={<KeyRound className="w-5 h-5 text-blue-700" />}
          title="בקרת גישה ואימות"
        >
          <ul className="list-disc pr-5 space-y-1">
            <li>כניסה מאובטחת לחשבון המארגן; אפשרות להקשחת סיסמה והגבלות.</li>
            <li>רישום פעולות מפתח (audit trail) לאירועים תפעוליים מרכזיים.</li>
          </ul>
        </Card>

        <Card
          icon={<EyeOff className="w-5 h-5 text-blue-700" />}
          title="פרטיות ושליטה בנתונים"
        >
          <ul className="list-disc pr-5 space-y-1">
            <li>מחיקת אורחים/אירועים לפי בקשתכם, כולל ניקוי הודעות עתידיות.</li>
            <li>ייצוא רשימות ל-CSV/Excel בכל עת.</li>
            <li>מסכים ציבוריים (כמו דף הזמנה) מציגים רק מידע הכרחי.</li>
          </ul>
        </Card>

        {more && (
          <>
            <Card
              icon={<Database className="w-5 h-5 text-blue-700" />}
              title="שמירת מידע מינימלית"
            >
              <ul className="list-disc pr-5 space-y-1">
                <li>
                  אוספים רק פרטים הנחוצים לתפעול האירוע (שם, טלפון, הערות בעת
                  הצורך).
                </li>
                <li>אין שימוש במידע האורחים לצרכי פרסום צד-ג׳.</li>
              </ul>
            </Card>

            <Card
              icon={<Trash2 className="w-5 h-5 text-blue-700" />}
              title="מחיקה ושימור"
            >
              <ul className="list-disc pr-5 space-y-1">
                <li>מחיקה יזומה דרך הדשבורד או בקשה אלינו לאחר האירוע.</li>
                <li>שימור בהתאם לצורך תפעולי/חשבונאי בלבד.</li>
              </ul>
            </Card>

            <Card
              icon={<Server className="w-5 h-5 text-blue-700" />}
              title="תשתיות ואירוח"
            >
              <ul className="list-disc pr-5 space-y-1">
                <li>אירוח אצל ספק ענן מוביל, עם אמצעי אבטחה פיזיים ולוגיים.</li>
                <li>הפרדת משאבים והקשחת רכיבי רשת בהתאם להמלצות ספק הענן.</li>
              </ul>
            </Card>

            <Card
              icon={<FileCheck className="w-5 h-5 text-blue-700" />}
              title="מדיניות ותיעוד"
            >
              <ul className="list-disc pr-5 space-y-1">
                <li>מסמך מדיניות פרטיות זמין לעיון.</li>
                <li>הסכם עיבוד נתונים (DPA) זמין לפי צורך לארגונים/ספקים.</li>
              </ul>
            </Card>
          </>
        )}
      </div>

      {/* קישורים מהירים ומתג “עוד פרטים” */}
      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={() => setMore((v) => !v)}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition"
        >
          <Info className="w-4 h-4" />
          {more ? "פחות פרטים" : "עוד פרטים"}
        </button>

        <Link
          href={privacyHref}
          className="inline-flex items-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white px-3 py-2 text-sm font-semibold transition"
        >
          מדיניות פרטיות
        </Link>

        <Link
          href={dpaHref}
          className="inline-flex items-center gap-2 rounded-xl border border-blue-300 px-3 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition"
        >
          בקשה להסכם עיבוד נתונים (DPA)
        </Link>
      </div>

      {/* דיסקליימר קצר */}
      <p className="mt-4 text-xs text-gray-500">
        האמור לעיל מסכם עקרונות אבטחה ופרטיות במונחים לא-משפטיים, ואינו מהווה
        ייעוץ משפטי. יישומים ספציפיים תלויים בהגדרות מערכת ובסביבת הלקוח.
      </p>
    </section>
  );
}
