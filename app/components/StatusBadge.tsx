import { useEffect, useState } from "react";

type Status = "לא ענה" | "בא" | "לא בא" | "אולי";

type StatusBadgeProps = {
  status: Status;
  total?: number;
};

export default function StatusBadge({ status, total }: StatusBadgeProps) {
  const [animate, setAnimate] = useState(false);

  useEffect(() => {
    if (typeof total === "number") {
      setAnimate(true);
      const timeout = setTimeout(() => setAnimate(false), 300);
      return () => clearTimeout(timeout);
    }
  }, [total]);

  const colorMap: Record<
    Status,
    { badgeBg: string; textColor: string; circleBg: string }
  > = {
    "לא ענה": {
      badgeBg: "bg-gray-100",
      textColor: "text-gray-800",
      circleBg: "bg-gray-500",
    },
    בא: {
      badgeBg: "bg-green-100",
      textColor: "text-green-800",
      circleBg: "bg-green-500",
    },
    "לא בא": {
      badgeBg: "bg-red-100",
      textColor: "text-red-800",
      circleBg: "bg-red-500",
    },
    אולי: {
      badgeBg: "bg-yellow-100",
      textColor: "text-yellow-800",
      circleBg: "bg-yellow-500",
    },
  };

  const { badgeBg, textColor, circleBg } = colorMap[status];

  return (
    <div className="relative inline-block w-fit rtl">
      {/* עיגול – רק אם total קיים */}
      {typeof total === "number" && (
        <div
          dir="trl"
          className={`absolute -top-2 -left-2 ${circleBg} text-white text-[10px] font-bold rounded-full w-5 h-5 flex items-center justify-center shadow transition-transform duration-300 ${
            animate ? "scale-125" : "scale-100"
          }`}
        >
          {total}
        </div>
      )}

      {/* תגית סטטוס עם רקע משתנה */}
      <div
        className={`${badgeBg} ${textColor} text-xs font-semibold rounded-full px-1 py-0.5 shadow min-w-[70px] text-center leading-tight`}
      >
        <div className="whitespace-nowrap truncate">{status}</div>
      </div>
    </div>
  );
}
