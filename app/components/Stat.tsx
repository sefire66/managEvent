type StatProps = {
  icon: string;
  label: string;
  value: string | number;
  color?:
    | "blue"
    | "gray"
    | "green"
    | "yellow"
    | "red"
    | "pink"
    | "purple"
    | "orange";
};

const colorMap: Record<string, string> = {
  blue: "text-blue-700",
  gray: "text-gray-700",
  green: "text-green-700",
  yellow: "text-yellow-600",
  red: "text-red-700",
  pink: "text-pink-700",
  purple: "text-purple-700",
  orange: "text-orange-700",
};

const Stat = ({ icon, label, value, color = "gray" }: StatProps) => {
  const valueClass = colorMap[color] || "text-gray-700";

  return (
    <div className="flex flex-wrap items-center gap-1">
      <span>{icon}</span>
      {label}: <span className={`${valueClass} font-semibold`}>{value}</span>
    </div>
  );
};

export default Stat;
