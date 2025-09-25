const TableItem = ({ table, guests, onEdit }: TableItemProps) => {
  const guestsAtTable = getGuestsAtTable(guests, table.number);
  const occupied = getOccupiedSeats(guests, table.number);
  const available = getAvailableSeats(table, guests);

  return (
    <div
      className="border rounded-lg p-3 shadow-sm bg-white hover:bg-gray-50 cursor-pointer transition flex flex-col space-y-2"
      style={{ direction: "rtl" }}
      onClick={() => onEdit(table)}
    >
      <div className="text-right space-y-1">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between text-sm font-semibold">
          <span className="text-blue-800">
            שולחן {table.number} ({table.totalSeats} מושבים)
          </span>
          <span className="text-xs font-normal text-gray-600">
            תפוסים:{" "}
            <span className="font-semibold text-red-600">{occupied}</span> —
            {available < 0 ? (
              <span className="text-orange-500 font-semibold flex items-center gap-1">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="w-4 h-4 fill-orange-500"
                  viewBox="0 0 24 24"
                >
                  <path d="M1 21h22L12 2 1 21zm13-3h-2v-2h2v2zm0-4h-2v-4h2v4z" />
                </svg>
                {Math.abs(available)} <span>חריגה</span>
              </span>
            ) : (
              <span
                className={
                  available === 0
                    ? "text-yellow-600 font-semibold"
                    : "text-green-600 font-semibold"
                }
              >
                {available} פנויים
              </span>
            )}
          </span>
        </div>
        {table.note && (
          <div className="text-xs text-yellow-700 italic">
            הערה: {table.note}
          </div>
        )}
      </div>
      <div className="flex items-start gap-4 mt-3 justify-center">
        <TableGuestList guests={guestsAtTable} />
        <TableDiagram table={table} occupied={occupied} available={available} />
      </div>
    </div>
  );
};

export default TableItem;
