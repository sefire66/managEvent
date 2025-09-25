"use client";

import type { EventPreferences } from "../types/types";

type Props = {
  value: EventPreferences;
  onChange: (next: EventPreferences) => void;
  disabled?: boolean;
};

export default function RsvpPreferencesPanel({
  value,
  onChange,
  disabled,
}: Props) {
  const handleToggleHide = () =>
    onChange({ ...value, hideDetails: !value.hideDetails });

  const handleRatio = (ratio: EventPreferences["imageRatio"]) =>
    onChange({ ...value, imageRatio: ratio });

  return (
    <div
      dir="rtl"
      className="w-full md:w-[320px] bg-white border border-gray-200 rounded-2xl p-4 shadow-sm"
      onClick={(e) => e.stopPropagation()} // שלא יקרוס את האקורדיון
    >
      <h3 className="text-base font-bold text-gray-800 mb-3">אפשרויות תצוגה</h3>

      {/* הסתרת פרטים */}
      <label className="flex items-start gap-3 mb-4 cursor-pointer">
        <input
          type="checkbox"
          className="mt-1"
          checked={!!value.hideDetails}
          onChange={handleToggleHide}
          disabled={disabled}
        />
        <div>
          <div className="text-sm font-medium text-gray-900">
            להסתיר פרטים נוספים
          </div>
          <div className="text-xs text-gray-500">
            משאיר רק את הכותרת “אנא אשרו הגעתכם”
          </div>
        </div>
      </label>

      {/* יחס תמונה */}
      <div className="mb-2">
        <div className="text-sm font-medium text-gray-900 mb-2">יחס תמונה</div>

        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="radio"
            name="imageRatio"
            value="auto"
            checked={value.imageRatio === "auto"}
            onChange={() => handleRatio("auto")}
            disabled={disabled}
          />
          <span className="text-sm text-gray-800">אוטומטי (ברירת מחדל)</span>
        </label>

        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="radio"
            name="imageRatio"
            value="16:9"
            checked={value.imageRatio === "16:9"}
            onChange={() => handleRatio("16:9")}
            disabled={disabled}
          />
          <span className="text-sm text-gray-800">16:9 (מסכים רחבים)</span>
        </label>

        <label className="flex items-center gap-2 mb-2 cursor-pointer">
          <input
            type="radio"
            name="imageRatio"
            value="4:3"
            checked={value.imageRatio === "4:3"}
            onChange={() => handleRatio("4:3")}
            disabled={disabled}
          />
          <span className="text-sm text-gray-800">4:3 (קלאסי)</span>
        </label>
      </div>
    </div>
  );
}
