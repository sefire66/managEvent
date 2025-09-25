// components/FaqSection.tsx
"use client";

import React from "react";
import {
  HelpCircle,
  ChevronDown,
  Upload,
  Smartphone,
  ShieldCheck,
  FileDown,
  Globe,
  MessageSquareText,
  MonitorSmartphone,
  Info,
} from "lucide-react";
import Link from "next/link";

export type FaqItem = {
  q: string;
  a: React.ReactNode;
};

const DEFAULT_FAQ: FaqItem[] = [
  {
    q: "איך מזמינים את האורחים? האם צריך אפליקציה?",
    a: (
      <>
        אנחנו שולחים את ההזמנה כקישור ב-<strong>SMS בלבד (לא WhatsApp)</strong>.
        האורח מקבל הודעה עם קישור ומאשר הגעה בעמוד ההזמנה—בלי להתקין שום
        אפליקציה.
      </>
    ),
  },
  {
    q: "איך מעלים רשימת אורחים?",
    a: (
      <>
        לאחר פתיחת אירוע ניגשים לחלק של <strong>ניהול אורחים </strong>
        בתוך החלק לחץ על <strong> הורד תבנית אקסל</strong> מעדכנים שמות וטלפונים
        ושומרים, לחיצה על <strong>העלה קובץ אקסל </strong> תפתח לנו בחירת קבצים
        בוחרים את הקובץ שלנו ולוחצים אישור, שימו לב{" "}
        <strong className="text-red-400">
          {" "}
          כשמעלים קובץ חדש הוא מחליף/מוחק את הרשימה הקודמת.
        </strong>{" "}
        לכן אם ברצונכם להוסיף כמות של אורחים, קודם הורידו את רשימת האורחים
        הקיימת לקובץ על ידי לחיצה על <strong>ייצא לאקסל </strong>
        תעדכנו את הקובץ ואז תעלו בחזרה, כמובן שניתן להוסיף אורח ידני אחד-אחד על
        ידי לחיצה על לחצן <strong>הוסף אורח </strong>.
        <br />
        <a
          href="/template_guest_list.xlsx"
          download
          className="inline-flex items-center gap-1 text-blue-700 underline decoration-blue-300 hover:decoration-blue-500"
        >
          <FileDown className="w-4 h-4" /> הורדת תבנית אקסל
        </a>
        .
      </>
    ),
  },
  {
    q: "אפשר לשנות/לערוך אורח אחרי ההעלאה?",
    a: (
      <>
        כן. בכל רגע אפשר לערוך שם, טלפון והערות, וגם לייבא שוב קובץ (אנחנו
        מדלגים על כפילויות לפי כלל שתגדירו).
      </>
    ),
  },
  {
    q: "מה זה “מסך ברכה/הנחיות” בכניסה?",
    a: (
      <>
        זהו <strong>דף אינטרנט רספונסיבי</strong> שמציג “ברוכים הבאים”, לו״ז קצר
        והנחיות כלליות. אפשר לפתוח אותו על אייפד/טאבלט או מסך גדול ואפשר להתאימו
        אישית. לא מבצע צ׳ק-אין ולא משבץ לשולחן—תצוגת מידע בלבד. אפשר להזמינו
        בתוספת תשלום עם שולחן קבלת פנים שכולל עמדת מארח/ת חכמה.
      </>
    ),
  },
  {
    q: "יש לכם עמדת צ׳ק-אין או שיבוץ שולחנות מהעמדה?",
    a: (
      <>
        כרגע <strong>לא</strong>. עמדת הקבלה שלנו היא לתצוגה בלבד (חיפוש
        אורחים/מידע). אם מספרי שולחן נקבעו מראש—אפשר <strong>להציג</strong> אותם
        בעמוד ההזמנה.
      </>
    ),
  },
  {
    q: "הודעות אוטומטיות—איך זה עובד?",
    a: (
      <>
        מגדירים פעם אחת הודעות <strong>SMS מתוזמנות</strong> (Save-the-Date,
        הזמנה עם קישור, תזכורת ללא-מאשרים, תודה אחרי האירוע וכו׳). ההודעות
        נשלחות <strong>ב-SMS בלבד</strong>.
      </>
    ),
  },
  {
    q: "האם המערכת בעברית מלאה ותומכת RTL?",
    a: (
      <>
        כן. כל המסכים ותבניות ההזמנה בנויים <strong>בעברית ו-RTL</strong>. ניתן
        להגדיר גם טקסטים באנגלית אם תרצו.
      </>
    ),
  },
  {
    q: "אבטחה ופרטיות—איך אתם שומרים על הנתונים?",
    a: (
      <>
        נתוני האורחים נשמרים בסביבה מאובטחת; גישה למארגנים בלבד. ניתן לבקש{" "}
        <strong>מחיקת נתונים</strong> אחרי האירוע.
      </>
    ),
  },
  {
    q: "אפשר לייצא את הרשימות לאקסל?",
    a: (
      <>
        כן. ניתן לייצא בכל רגע את רשימת האורחים, אישורי ההגעה והערות ל-
        <strong>CSV/Excel</strong>.
      </>
    ),
  },
  {
    q: "האם אפשר להתאים את עיצוב דף ההזמנה?",
    a: <>בהחלט. ניתן לשנות צבעים, תמונות וכותרות כדי להתאים למיתוג שלכם.</>,
  },
];

export default function FaqSection({
  items = DEFAULT_FAQ,
  title = "שאלות נפוצות",
  subtitle = "כל מה שרציתם לדעת בקצרה.",
  allowMultipleOpen = true, // פותח כמה יחד; אם false – אקורדיון יחיד
  className = "",
}: {
  items?: FaqItem[];
  title?: string;
  subtitle?: string;
  allowMultipleOpen?: boolean;
  className?: string;
}) {
  const [open, setOpen] = React.useState<number[]>([]);

  const toggle = (idx: number) => {
    setOpen((prev) => {
      const exists = prev.includes(idx);
      if (allowMultipleOpen) {
        return exists ? prev.filter((i) => i !== idx) : [...prev, idx];
      }
      return exists ? [] : [idx];
    });
  };

  return (
    <section
      dir="rtl"
      className={`mt-6 max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px] ${className}`}
      aria-label="שאלות נפוצות"
    >
      <div className="text-center md:text-right mb-4">
        <h3 className="flex items-center justify-center md:justify-start gap-2 text-2xl sm:text-3xl font-bold text-blue-800">
          <HelpCircle className="w-6 h-6 text-blue-700" />
          {title}
        </h3>
        {subtitle && (
          <p className="text-gray-700 mt-1 text-sm sm:text-base">{subtitle}</p>
        )}
      </div>

      <div className="divide-y divide-blue-100 rounded-xl border border-blue-100 bg-white">
        {items.map((it, idx) => {
          const isOpen = open.includes(idx);
          return (
            <div key={idx} className="p-3 sm:p-4">
              <button
                type="button"
                onClick={() => toggle(idx)}
                className="w-full flex items-center justify-between gap-3 text-right"
                aria-expanded={isOpen}
                aria-controls={`faq-panel-${idx}`}
              >
                <span className="text-base sm:text-lg font-semibold text-blue-900">
                  {it.q}
                </span>
                <ChevronDown
                  className={`w-5 h-5 shrink-0 transition-transform ${isOpen ? "rotate-180" : ""}`}
                />
              </button>

              {isOpen && (
                <div
                  id={`faq-panel-${idx}`}
                  className="mt-2 text-sm sm:text-base text-gray-700 leading-7"
                >
                  {it.a}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* שורת אייקונים קטנה להבהרה (אופציונלי, קוסמטי) */}
      <div className="mt-5 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 text-xs text-blue-800/80">
        <span className="inline-flex items-center gap-1.5">
          <Upload className="w-4 h-4" /> העלאת אקסל
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MessageSquareText className="w-4 h-4" /> SMS בלבד
        </span>
        <span className="inline-flex items-center gap-1.5">
          <MonitorSmartphone className="w-4 h-4" /> מסכי קבלה
        </span>
        <span className="inline-flex items-center gap-1.5">
          <Globe className="w-4 h-4" /> RTL/עברית
        </span>
        <span className="inline-flex items-center gap-1.5">
          <ShieldCheck className="w-4 h-4" /> פרטיות
        </span>
      </div>
    </section>
  );
}
