// components/SmsAutomationPreview.tsx
"use client";

import React from "react";
import {
  Calendar,
  Send,
  BellRing,
  CheckCircle2,
  PartyPopper,
  OctagonX,
} from "lucide-react";

import type { Guest, EventDetails } from "@/app/types/types";
import type {
  CancelTemplateOpts,
  SmsType,
} from "../../lib/generateSmsMessageByType";
import { generateSmsMessageByType } from "../../lib/generateSmsMessageByType"; // עדכן לנתיב האמיתי

type Item = {
  type: SmsType;
  icon: React.ReactNode;
  title: string;
  when: string;
  audience: string;
  show?: boolean; // אפשר לכבות סוג מסוים
};

const DEFAULT_ITEMS: Item[] = [
  {
    type: "saveDate",
    icon: <Calendar className="w-5 h-5 text-blue-700" />,
    title: "Save the Date",
    when: "4 שבועות לפני",
    audience: "לכל הרשימה",
    show: true,
  },
  {
    type: "invitation",
    icon: <Send className="w-5 h-5 text-blue-700" />,
    title: "הזמנה + קישור RSVP",
    when: "10 ימים לפני",
    audience: "לכל הרשימה",
    show: true,
  },
  {
    type: "reminder",
    icon: <BellRing className="w-5 h-5 text-blue-700" />,
    title: "תזכורת ללא-מאשרים",
    when: "8–6 ימים לפני",
    audience: "רק מי שלא אישרו",
    show: true,
  },
  {
    type: "tableNumber",
    icon: <CheckCircle2 className="w-5 h-5 text-blue-700" />,
    title: "מספר שולחן (ביום האירוע)",
    when: "בבוקר האירוע",
    audience: "מאשרים בלבד",
    show: true,
  },
  {
    type: "thankYou",
    icon: <PartyPopper className="w-5 h-5 text-blue-700" />,
    title: "תודה",
    when: "יום אחרי",
    audience: "מי שהגיעו",
    show: true,
  },
  {
    type: "cancel",
    icon: <OctagonX className="w-5 h-5 text-red-600" />,
    title: "ביטול אירוע",
    when: "בעת הצורך",
    audience: "לפי החלטה",
    show: false,
  },
];

export default function SmsAutomationPreview({
  event,
  sampleGuest,
  rsvpLink = "",
  cancelOpts,
  items = DEFAULT_ITEMS,
}: {
  event: EventDetails;
  sampleGuest: Guest;
  rsvpLink?: string;
  cancelOpts?: CancelTemplateOpts;
  items?: Item[];
}) {
  const renderBody = (type: SmsType) =>
    generateSmsMessageByType(type, sampleGuest, event, rsvpLink, cancelOpts);

  return (
    <section
      dir="rtl"
      className="mt-6 max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px]"
      aria-label="הודעות SMS מתוזמנות (Preview מתוך המערכת)"
    >
      <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-2 text-center">
        הודעות SMS מתוזמנות (אוטומציה)
      </h3>
      <p className="text-center text-gray-700 mb-6 text-sm sm:text-base">
        התצוגה מטה נוצרת ישירות מהטמפלטים במערכת — כך תראו בדיוק מה יישלח.
      </p>

      <div className="flex flex-col gap-4">
        {items
          .filter((i) => i.show !== false)
          .map((it, idx) => {
            const body = renderBody(it.type);
            return (
              <article
                key={idx}
                className="bg-white border border-blue-200 rounded-2xl shadow p-5"
              >
                <div className="flex items-start gap-3">
                  <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 shrink-0">
                    {it.icon}
                  </div>

                  <div className="flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-2">
                      <h4 className="text-base sm:text-lg font-bold text-blue-900">
                        {it.title}
                      </h4>
                      <span className="text-xs sm:text-sm px-2 py-0.5 rounded-full bg-blue-50 border border-blue-200 text-blue-800">
                        {it.when}
                      </span>
                      <span className="text-xs sm:text-sm px-2 py-0.5 rounded-full bg-cyan-50 border border-cyan-200 text-cyan-800">
                        קהל יעד: {it.audience}
                      </span>
                    </div>

                    {/* הטקסט כפי שנוצר בפונקציה שלכם */}
                    <pre
                      dir="rtl"
                      className="whitespace-pre-wrap text-[13.5px] sm:text-sm md:text-base leading-7 text-gray-800 bg-gray-50 rounded-lg border border-gray-200 p-3"
                    >
                      {body}
                    </pre>
                  </div>
                </div>
              </article>
            );
          })}
      </div>

      <ul className="list-disc pr-5 mt-5 space-y-1 text-xs sm:text-sm text-gray-600">
        <li>שליחה ב-SMS בלבד (לא WhatsApp).</li>
        <li>
          התוכן כאן נבנה מ־<code>generateSmsMessageByType</code> — תואם 1:1
          למערכת.
        </li>
        <li>
          ניתן להציג/להסתיר סוגי הודעות דרך ה־prop <code>items</code> (למשל
          להסתיר ביטול).
        </li>
      </ul>
    </section>
  );
}
