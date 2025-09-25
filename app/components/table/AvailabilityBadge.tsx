// AvailabilityBadge.tsx
export const AvailabilityBadge = ({ available }: { available: number }) => {
  const absValue = Math.abs(available);

  if (available === 0) {
    return (
      <div className="bg-yellow-400 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        {absValue}
      </div>
    );
  } else if (available > 0) {
    return (
      <div className="bg-green-500 text-white text-xs rounded-full w-6 h-6 flex items-center justify-center">
        {absValue}
      </div>
    );
  } else {
    return (
      <div className="bg-red-600 animate-pulse text-white text-lg font-extrabold rounded-full w-10 h-10 flex items-center justify-center">
        {absValue}
      </div>
    );
  }
};
