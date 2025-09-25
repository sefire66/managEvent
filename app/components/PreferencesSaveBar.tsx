"use client";

type Props = {
  dirty: boolean;
  saving: boolean;
  error?: string;
  lastSavedAt?: string;
  onSave: () => void;
};

export default function PreferencesSaveBar({
  dirty,
  saving,
  error,
  lastSavedAt,
  onSave,
}: Props) {
  return (
    <div
      dir="rtl"
      className="w-full md:w-[320px] flex flex-col gap-2 mt-3"
      onClick={(e) => e.stopPropagation()} // שלא יקרוס את האקורדיון
    >
      <button
        type="button"
        disabled={!dirty || saving}
        onClick={onSave}
        style={{ cursor: "pointer" }}
        className={`w-full rounded-xl py-2 text-white font-semibold transition
          ${!dirty || saving ? "bg-blue-300 cursor-not-allowed" : "bg-blue-600 hover:bg-blue-700"}
        `}
      >
        {saving ? "שומר…" : "שמור העדפות"}
      </button>

      <div className="text-xs text-gray-600">
        {error ? (
          <span className="text-red-600">שגיאה בשמירה: {error}</span>
        ) : dirty ? (
          <span>יש שינויים שלא נשמרו</span>
        ) : lastSavedAt ? (
          <span>
            נשמר לאחרונה: {new Date(lastSavedAt).toLocaleString("he-IL")}
          </span>
        ) : (
          <span>אין שינויים</span>
        )}
      </div>
    </div>
  );
}
