// components/ReceptionTable.tsx
"use client";

import React from "react";
import { DoorOpen, Users, Smile } from "lucide-react";
import Link from "next/link";
import Image from "next/image";

export default function ReceptionTable() {
  const [isOpen, setIsOpen] = React.useState(false);

  return (
    <section
      className="max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 mt-5 mb-16 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px]"
      dir="rtl"
      aria-label="שולחן קבלת פנים דיגיטלי"
    >
      {/* כותרת + תיאור קצר */}
      <div className="text-center md:text-right mb-6">
        <h2 className="text-3xl sm:text-4xl font-extrabold text-blue-700 mb-3">
          שולחן קבלת פנים דיגיטלי
        </h2>
        <p className="text-lg sm:text-xl text-gray-700">
          שולחן קבלה עם עמדות דיגיטלית לחיפוש מהיר של אורחים והצגת מקומות ישיבה
          — בצורה נעימה ומסודרת.
        </p>
      </div>

      {/* תוכן: טקסט ותמונה */}
      <div className="grid grid-cols-1 sm:grid-cols-[180px_1fr] gap-10 items-start ">
        {/* תמונה — ללא חיתוך (object-contain) */}
        <div className="flex-1">
          {/* <div className=" hidden sm:block relative w-[400px] sm:w-[200px] h-[260px] sm:h-[320px] md:h-[360px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm ">
            <Image
              src="/images/receptionTable.jpg"
              alt="תצוגת שולחן קבלת פנים דיגיטלי"
              fill
              className="w-full h-[260px] object-fill sm:object-cover rounded-xl "
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={false}
            />
          </div> */}
          <div className=" relative w-[500px] sm:w-[200px] h-[260px] sm:h-[320px] md:h-[360px] bg-gray-50 rounded-xl overflow-hidden border border-gray-200 shadow-sm justify-self-center ">
            <Image
              src="/images/pexels-reneterp.jpg"
              alt="תצוגת שולחן קבלת פנים דיגיטלי"
              fill
              className="w-full h-[260px] object-fill sm:object-cover rounded-xl "
              sizes="(max-width: 768px) 100vw, 50vw"
              priority={false}
            />
          </div>
          {/* <p className="text-center text-xs text-gray-500 mt-2">
            *תמונת הדגמה — העיצוב בפועל ניתן להתאמה אישית.
          </p> */}
        </div>
        {/* טקסט + נקודות */}
        <div className="flex-1">
          <div className="flex flex-col gap-4 text-blue-700 text-lg">
            <div className="flex items-center gap-2">
              <Users size={24} />
              <span>רשימות מוזמנים מסונכרנות וחיפוש מהיר לפי שם/טלפון</span>
            </div>
            <div className="flex items-center gap-2">
              <DoorOpen size={24} />
              <span>קבלה מסודרת בעמדה ייעודית, בלי מסמכים מודפסים</span>
            </div>
            <div className="flex items-center gap-2">
              <Smile size={24} />
              <span>תצוגת “ברוכים הבאים” והנחיות כלליות לאורחים</span>
            </div>
          </div>

          {/* אקורדיון: פרטים נוספים */}
          <div className="mt-6">
            <button
              type="button"
              onClick={() => setIsOpen((v) => !v)}
              className="w-full md:w-auto inline-flex items-center justify-center gap-2 rounded-xl border border-blue-300 px-4 py-2 text-sm font-semibold text-blue-800 hover:bg-blue-50 transition"
              aria-expanded={isOpen}
            >
              {isOpen ? "פחות פרטים" : "עוד פרטים"}
            </button>

            {isOpen && (
              <div className="mt-4 bg-blue-50/50 border border-blue-200 rounded-xl p-4 text-sm text-gray-800 leading-7">
                <ul className="list-disc pr-5 space-y-1">
                  <li>
                    חיפוש אורח והצגת פרטי הגעה קיימים (כמו מספר מוזמנים/הערות).
                  </li>
                  <li>הצגת מספר שולחן לכל אורח שאישר הגעה.</li>
                  <li>תצוגת ברכה/הנחיות כלליות על המסך עבור כל האורחים.</li>
                  <li>תמיכה במצב “קיוסק” למסך מלא בעמדת הקבלה.</li>
                </ul>
              </div>
            )}
          </div>

          {/* CTA */}
          <div className="mt-6">
            <Link
              href="/contactus"
              className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold py-3 px-6 rounded-full transition"
            >
              דברו איתנו על שולחן קבלת פנים
            </Link>
          </div>
        </div>
      </div>
    </section>
  );
}
