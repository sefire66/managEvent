import { useEffect, useState } from "react";

type TableBadgeProps = {
  tableNumber: number;
  freeSeats: number;
};

export default function TableBadge({
  tableNumber,
  freeSeats,
}: TableBadgeProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    setAnimate(true);
    const timeout = setTimeout(() => setAnimate(false), 300);
    return () => clearTimeout(timeout);
  }, [freeSeats]);

  let circleColor = "bg-green-500";
  const isOverflow = freeSeats < 0;

  if (freeSeats === 0) {
    circleColor = "bg-yellow-400";
  } else if (isOverflow) {
    circleColor = "bg-red-500";
  }

  return (
    <div className="relative inline-block w-fit rtl">
      {/* העיגול שמציג את כמות המקומות הפנויים */}
      {tableNumber !== 0 && (
        <div
          dir="ltr"
          className={`absolute -top-2 -left-2 ${circleColor} text-white text-[12px] md:text-[14px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow transition-transform duration-300 ${
            animate ? "scale-125" : "scale-100"
          }`}
        >
          {freeSeats}
        </div>
      )}

      {/* תגית לשולחן - עם טקסט בשורה אחת וקטן */}
      <div
        className={`${
          tableNumber === 0
            ? "bg-gray-200 text-gray-700"
            : "bg-blue-100 text-blue-900"
        } font-semibold rounded-full px-4 py-1 shadow min-w-[80px] text-center leading-tight`}
      >
        {tableNumber === 0 ? (
          <div className="whitespace-nowrap truncate">בחר שולחן</div>
        ) : (
          <>
            <div className="whitespace-nowrap truncate">
              לשולחן {tableNumber}
            </div>
            {isOverflow && (
              <div className="text-[10px] font-normal hidden md:block">
                חריגה
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
