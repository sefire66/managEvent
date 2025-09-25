// ChairIcon.tsx
export const ChairIcon = ({ occupied }: { occupied: boolean }) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    className="w-5 h-5"
    fill={occupied ? "#ef4444" : "#22c55e"}
    viewBox="0 0 24 24"
  >
    <path d="M6 2h12a1 1 0 0 1 1 1v2H5V3a1 1 0 0 1 1-1zm-1 5h14v3H5V7zm2 4h10v7a1 1 0 1 1-2 0v-5H9v5a1 1 0 1 1-2 0v-7z" />
  </svg>
);
