"use client";
import { useEffect, useState } from "react";
import { Trash2, Plus, Search, ChevronsUpDown } from "lucide-react";

export type Guest = {
  phone: string;
  name: string;
  status: "בא" | "לא בא" | "לא ענה";
  table: string;
  count: string;
};

type GuestTableProps = {
  guestList: Guest[];
};

const GuestTable = ({ guestList }: GuestTableProps) => {
  const [guests, setGuests] = useState<Guest[]>([]);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState<Guest["status"] | "">("");
  const [tableFilter, setTableFilter] = useState("");
  const [sortKey, setSortKey] = useState<keyof Guest | "">("");
  const [sortAsc, setSortAsc] = useState(true);

  useEffect(() => {
    setGuests(guestList);
  }, [guestList]);

  const handleChange = (index: number, field: keyof Guest, value: string) => {
    const updated = [...guests];
    if (field === "status") {
      updated[index][field] = value as Guest["status"];
    } else {
      updated[index][field] = value;
    }
    setGuests(updated);
    localStorage.setItem("guestList", JSON.stringify(updated));
  };

  const handleDelete = (index: number) => {
    const updated = guests.filter((_, i) => i !== index);
    setGuests(updated);
    localStorage.setItem("guestList", JSON.stringify(updated));
  };

  const handleAddGuest = () => {
    const newGuest: Guest = {
      phone: "",
      name: "",
      status: "לא ענה",
      table: "",
      count: "1"
    };
    const updated = [...guests, newGuest];
    setGuests(updated);
    localStorage.setItem("guestList", JSON.stringify(updated));
  };

  const handleExportCSV = () => {
    const headers = ["טלפון", "שם", "סטטוס", "שולחן", "כמות מוזמנים"];
    const rows = filteredGuests.map((g) => [g.phone, g.name, g.status, g.table, g.count]);
    const csvContent = [headers, ...rows].map((e) => e.join(",")).join("\n");
    const blob = new Blob(["\uFEFF" + csvContent], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "guest_list.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleSort = (key: keyof Guest) => {
    if (sortKey === key) {
      setSortAsc(!sortAsc);
    } else {
      setSortKey(key);
      setSortAsc(true);
    }
  };

  const filteredGuests = guests
    .filter(
      (g) =>
        (g.name.includes(searchTerm) || g.phone.includes(searchTerm)) &&
        (statusFilter === "" || g.status === statusFilter) &&
        (tableFilter === "" || g.table === tableFilter)
    )
    .sort((a, b) => {
      if (!sortKey) return 0;
      const valA = a[sortKey] ?? "";
      const valB = b[sortKey] ?? "";
      return sortAsc
        ? valA.toString().localeCompare(valB.toString())
        : valB.toString().localeCompare(valA.toString());
    });

  const uniqueTables = Array.from(new Set(guests.map((g) => g.table))).filter(Boolean);

  const totalComing = filteredGuests.reduce((sum, guest) => {
    return guest.status === "בא" ? sum + parseInt(guest.count || "1", 10) : sum;
  }, 0);

  return (
    <div className="bg-white rounded-xl shadow p-6">
      <h2 className="text-xl font-bold text-blue-700 mb-2 text-center">רשימת מוזמנים</h2>
      <p className="text-sm text-center text-gray-600">סה"כ מוזמנים: {filteredGuests.length}</p>
      <p className="text-sm text-center text-green-700 mb-4">סה"כ צפויים להגיע: {totalComing}</p>

      <div className="flex flex-col sm:flex-row justify-between items-center gap-4 mb-4">
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Search className="text-gray-500" />
          <input
            type="text"
            placeholder="חיפוש לפי שם או טלפון"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="border px-3 py-2 rounded w-full sm:w-64"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as Guest["status"])}
            className="border px-3 py-2 rounded"
          >
            <option value="">כל הסטטוסים</option>
            <option value="בא">בא</option>
            <option value="לא בא">לא בא</option>
            <option value="לא ענה">לא ענה</option>
          </select>
          <select
            value={tableFilter}
            onChange={(e) => setTableFilter(e.target.value)}
            className="border px-3 py-2 rounded"
          >
            <option value="">כל השולחנות</option>
            {uniqueTables.map((t) => (
              <option key={t} value={t}>{t}</option>
            ))}
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => {
              setSearchTerm("");
              setStatusFilter("");
              setTableFilter("");
            }}
            className="bg-gray-300 text-gray-800 px-4 py-2 rounded hover:bg-gray-400"
          >
            איפוס חיפוש
          </button>
          <button
            onClick={handleAddGuest}
            className="flex items-center gap-1 bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700"
          >
            <Plus size={18} /> הוסף אורח
          </button>
          <button
            onClick={handleExportCSV}
            className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
          >
            ייצוא CSV
          </button>
        </div>
      </div>

      {filteredGuests.length === 0 ? (
        <p className="text-center text-gray-500">לא נמצאו מוזמנים</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-right border">
            <thead className="bg-gray-100">
              <tr>
                {[
                  { key: "phone", label: "טלפון" },
                  { key: "name", label: "שם" },
                  { key: "status", label: "סטטוס" },
                  { key: "table", label: "מספר שולחן" },
                  { key: "count", label: "כמות" }
                ].map((col) => (
                  <th
                    key={col.key}
                    className="px-4 py-2 border cursor-pointer select-none"
                    onClick={() => handleSort(col.key as keyof Guest)}
                  >
                    <div className="flex items-center justify-between">
                      {col.label} <ChevronsUpDown size={16} />
                    </div>
                  </th>
                ))}
                <th className="px-4 py-2 border">מחיקה</th>
              </tr>
            </thead>
            <tbody>
              {filteredGuests.map((guest, index) => (
                <tr key={index} className="odd:bg-white even:bg-gray-50">
                  <td className="px-4 py-2 border">
                    <input
                      type="text"
                      value={guest.phone}
                      onChange={(e) => handleChange(index, "phone", e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                  <td className="px-4 py-2 border">
                    <input
                      type="text"
                      value={guest.name}
                      onChange={(e) => handleChange(index, "name", e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                  <td className="px-4 py-2 border">
                    <select
                      value={guest.status}
                      onChange={(e) => handleChange(index, "status", e.target.value as "בא" | "לא בא" | "לא ענה")}
                      className="border rounded px-2 py-1 w-full"
                    >
                      <option value="בא">בא</option>
                      <option value="לא בא">לא בא</option>
                      <option value="לא ענה">לא ענה</option>
                    </select>
                  </td>
                  <td className="px-4 py-2 border">
                    <input
                      type="text"
                      value={guest.table}
                      onChange={(e) => handleChange(index, "table", e.target.value)}
                      className="border rounded px-2 py-1 w-full"
                    />
                  </td>
                  <td className="px-4 py-2 border">
                    <input
                      type="number"
                      value={guest.count}
                      min="1"
                      onChange={(e) => handleChange(index, "count", e.target.value)}
                      className="border rounded px-2 py-1 w-full text-center"
                    />
                  </td>
                  <td className="px-4 py-2 border text-center">
                    <button
                      onClick={() => handleDelete(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={18} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

export default GuestTable;
