"use client";

type Props = {
  eventType?: string;
  brideName?: string; // בברית/בריתה: "ניב ואורות"
  groomName?: string;
  brideLast?: string;
  setShowNewEvent: (show: boolean) => void;
  isCanceled?: boolean;
  loading?: boolean; // 👈 חדש: מצב טעינה
};

export default function EventTitle({
  eventType,
  brideName,
  brideLast,
  groomName,
  setShowNewEvent,
  isCanceled,
  loading = false,
}: Props) {
  const baseStyle =
    "text-3xl font-extrabold text-center p-6 rounded-xl shadow-sm relative overflow-hidden my-3";

  // עטיפה שמוסיפה תגית ביטול + ספינר טעינה אחיד לכל המקרים
  const TitleWrapper: React.FC<{
    className: string;
    children: React.ReactNode;
  }> = ({ className, children }) => (
    <div dir="rtl" className={`${baseStyle} ${className}`}>
      {/* תגית מצב אם האירוע מבוטל */}
      {isCanceled && (
        <span className="ml-2 inline-block rounded-full bg-red-100 text-red-700 px-3 py-1 text-lg z-10 relative">
          אירוע בוטל
        </span>
      )}

      {/* תוכן הכותרת - מתעמעם בזמן טעינה */}
      <div className={loading ? "opacity-40 pointer-events-none" : ""}>
        {children}
      </div>

      {/* Overlay טעינה */}
      {loading && (
        <div className="absolute inset-0 bg-white/50 flex items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-300 border-t-transparent" />
        </div>
      )}
    </div>
  );

  switch (eventType) {
    case "חתונה":
      return (
        <TitleWrapper className="text-[#b8895d] bg-[#fdf6ec] border border-[#e2cfcf] shadow-inner">
          <div className="absolute top-0 left-4 text-2xl">💍</div>
          <div className="absolute top-0 right-4 text-2xl">💍</div>
          החתונה המרגשת של <span className="underline">{groomName}</span> ו
          <span className="underline">{brideName}</span>
          <div className="mt-2 text-lg font-normal text-[#9c715a]">
            באהבה ובשמחה 💖
          </div>
        </TitleWrapper>
      );

    case "חינה":
      return (
        <TitleWrapper className="text-emerald-700 bg-emerald-50">
          🧿 חוגגים חינה ל<span className="underline">{groomName}</span> ו
          <span className="underline">{brideName}</span> 🧿
        </TitleWrapper>
      );

    case "בר מצווה":
      return (
        <TitleWrapper className="text-blue-700 bg-blue-50">
          🎉 בר המצווה החגיגי של <span className="underline">{groomName}</span>{" "}
          🎉
        </TitleWrapper>
      );

    case "בת מצווה":
      return (
        <TitleWrapper className="text-purple-700 bg-purple-50">
          🎊 בת המצווה הנוצצת של <span className="underline">{brideName}</span>{" "}
          🎊
        </TitleWrapper>
      );

    case "ברית":
      return (
        <TitleWrapper className="text-sky-700 bg-sky-50">
          🎈 ברית לבנם של <span className="underline">{brideName}</span> 🎈
        </TitleWrapper>
      );

    case "בריתה":
      return (
        <TitleWrapper className="text-rose-700 bg-rose-50">
          🎀 בריתה לבתם של <span className="underline">{brideName}</span> 🎀
        </TitleWrapper>
      );

    case "יום הולדת":
      return (
        <TitleWrapper className="text-yellow-700 bg-yellow-50">
          🎂 חוגגים יום הולדת ל<span className="underline">{brideName}</span> 🎉
        </TitleWrapper>
      );

    case "אירוע עסקי":
      return (
        <TitleWrapper className="text-gray-800 bg-gray-100">
          💼 ברוכים הבאים ל{brideName} של {brideLast} 💼
        </TitleWrapper>
      );

    default:
      return (
        <TitleWrapper className="text-yellow-800 bg-yellow-50 animate-fade-in">
          <div className="text-2xl font-extrabold mb-2">
            🎉 ברוך הבא למערכת האירועים! 🎉
          </div>
          <div className="text-lg mb-4">נראה שעדיין לא יצרת אירוע ראשון 🥳</div>
          <div className="text-base mb-6">כדי להתחיל, לחץ על הכפתור למטה</div>
          {typeof setShowNewEvent === "function" && (
            <button
              className="bg-pink-600 text-white px-6 py-3 rounded-full hover:bg-pink-700 transition-all shadow-md"
              onClick={() => setShowNewEvent(true)}
            >
              💖 צור אירוע חדש עכשיו
            </button>
          )}
        </TitleWrapper>
      );
  }
}
