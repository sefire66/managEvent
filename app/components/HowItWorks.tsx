// components/HowItWorks.tsx
"use client";

import React from "react";
import {
  UserPlus,
  Calendar,
  Upload,
  Send,
  CheckCircle2,
  LayoutGrid,
  LucideIcon,
} from "lucide-react";

/** טיפוס לצעד יחיד */
export type HowItWorksStep = {
  icon: LucideIcon;
  title: string;
  text: string;
};

/** שלבים (שלב 1: הרשמה דרך התפריט העליון) */
export const defaultSteps: HowItWorksStep[] = [
  {
    icon: UserPlus,
    title: "נרשמים בחינם (מהתפריט למעלה)",
    text: "לוחצים על 'הרשמה' בתפריט העליון, יוצרים משתמש וסיסמה ומתחברים למערכת.",
  },
  {
    icon: Calendar,
    title: "יוצרים את האירוע",
    text: "עורכים פרטי אירוע בלוח הבקרה, מזינים תאריך, מקום וסוג אירוע ומעצבים דף הזמנה.",
  },
  {
    icon: Upload,
    title: "מעלים את האורחים מקובץ אקסל",
    text:
      "מורידים קובץ תבנית אקסל, מעדכנים בו את רשימת האורחים (שם, טלפון, סטטוס כמות), " +
      "ושומרים. לאחר מכן מעלים את הקובץ למערכת (XLSX). יש אימות מספרי טלפון " +
      "והתראה על שורות שדולגו.",
  },
  {
    icon: Send,
    title: "שולחים הזמנות ב-SMS",
    text: "משתפים לינק הזמנה ב-SMS. אפשר לראות תצוגה מקדימה לפני השליחה.",
  },
  {
    icon: CheckCircle2,
    title: "אישורי הגעה בזמן אמת",
    text: "רואים ספירה חיה של מוזמנים וסטטוסים, כולל הודעות מהאורחים.",
  },
  {
    icon: LayoutGrid,
    title: "מסדרים שולחנות בקלות",
    text: "מעבירים אורחים בין שולחנות בקליק ורואים מקומות פנויים בכל רגע.",
  },
];

export type HowItWorksProps = {
  title?: string;
  subtitle?: string;
  steps?: HowItWorksStep[];
  className?: string; // מרווח חיצוני (למשל mt-10)
};

/** כרטיס צעד יחיד */
function StepCard({ step, index }: { step: HowItWorksStep; index: number }) {
  const Icon = step.icon;
  return (
    <div className="bg-white border border-blue-200 rounded-2xl shadow p-5">
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-blue-50 border border-blue-200 shrink-0">
          <Icon className="w-5 h-5 text-blue-700" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs text-blue-500 font-semibold">
              שלב {index}
            </span>
            <h4 className="text-base sm:text-lg font-bold text-blue-900">
              {step.title}
            </h4>
          </div>
          <p className="text-sm sm:text-base text-gray-700 leading-relaxed">
            {step.text}
          </p>
        </div>
      </div>
    </div>
  );
}

/** “איך זה עובד” — אנכי, אחד מתחת לשני */
export default function HowItWorks({
  title = "איך זה עובד?",
  subtitle = "תהליך פשוט מההרשמה ועד השליחה לאורחים.",
  steps = defaultSteps,
  className = "",
}: HowItWorksProps) {
  return (
    <section
      dir="rtl"
      className={`mt-4 max-w-5xl w-[90%] mx-auto px-4 sm:px-6 lg:px-8 text-gray-800 bg-white rounded-xl shadow-sm pb-4 border-blue-500 [border-width:5px] ${className}`}
    >
      <h3 className="text-2xl sm:text-3xl font-bold text-blue-800 mb-3 text-center">
        {title}
      </h3>

      {subtitle && (
        <p className="text-center text-gray-700 mb-6 text-sm sm:text-base">
          {subtitle}
        </p>
      )}

      {/* אחד מתחת לשני */}
      <div className="flex flex-col gap-4">
        {steps.map((s, i) => (
          <StepCard key={i} step={s} index={i + 1} />
        ))}
      </div>
    </section>
  );
}
