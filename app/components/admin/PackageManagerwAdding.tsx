"use client";

import { useEffect, useState } from "react";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

export default function PackageManager() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [newPackage, setNewPackage] = useState({
    name: "",
    price: 0,
    smsAmount: 0,
  });

  useEffect(() => {
    fetchPackages();
  }, []);

  const fetchPackages = () => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then(setPackages)
      .catch(console.error);
  };

  const handleUpdate = async (pkg: PackageType) => {
    const res = await fetch(`/api/packages/${pkg._id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ price: pkg.price, smsAmount: pkg.smsAmount }),
    });

    if (res.ok) {
      alert("Package updated successfully");
    } else {
      const error = await res.json();
      alert("Update failed: " + (error.error || "Unknown error"));
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm("האם למחוק את החבילה לצמיתות?")) return;

    const res = await fetch(`/api/packages/${id}`, { method: "DELETE" });
    if (res.ok) {
      setPackages((prev) => prev.filter((p) => p._id !== id));
      alert("Package deleted");
    } else {
      const error = await res.json();
      alert("Delete failed: " + (error.error || "Unknown error"));
    }
  };

  const handleCreate = async () => {
    if (!newPackage.name || newPackage.price < 0 || newPackage.smsAmount <= 0) {
      alert("אנא מלא את כל השדות עם ערכים תקינים");
      return;
    }

    const res = await fetch("/api/packages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(newPackage),
    });

    if (res.ok) {
      const created = await res.json();
      setPackages((prev) => [...prev, created]);
      setNewPackage({ name: "", price: 0, smsAmount: 0 });
      alert("Package created successfully");
    } else {
      const error = await res.json();
      alert("Creation failed: " + (error.error || "Unknown error"));
    }
  };

  return (
    <div className="p-6 bg-white rounded shadow">
      <h2 className="text-2xl font-semibold mb-4">ניהול חבילות</h2>

      <div className="overflow-x-auto mb-6">
        <table className="w-full border">
          <thead>
            <tr className="bg-gray-100">
              <th className="border p-2">שם חבילה</th>
              <th className="border p-2">מחיר</th>
              <th className="border p-2">כמות SMS</th>
              <th className="border p-2">פעולות</th>
            </tr>
          </thead>
          <tbody>
            {packages.map((pkg) => (
              <tr key={pkg._id}>
                <td className="border p-2">{pkg.name}</td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={pkg.price}
                    onChange={(e) =>
                      setPackages((prev) =>
                        prev.map((p) =>
                          p._id === pkg._id
                            ? { ...p, price: Number(e.target.value) }
                            : p
                        )
                      )
                    }
                    className="border p-1 w-24"
                  />
                </td>
                <td className="border p-2">
                  <input
                    type="number"
                    value={pkg.smsAmount}
                    onChange={(e) =>
                      setPackages((prev) =>
                        prev.map((p) =>
                          p._id === pkg._id
                            ? { ...p, smsAmount: Number(e.target.value) }
                            : p
                        )
                      )
                    }
                    className="border p-1 w-24"
                  />
                </td>
                <td className="border p-2 space-x-2">
                  <button
                    onClick={() => handleUpdate(pkg)}
                    className="text-blue-600 underline"
                  >
                    עדכן
                  </button>
                  <button
                    onClick={() => handleDelete(pkg._id)}
                    className="text-red-600 underline"
                  >
                    מחק
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <h3 className="text-xl font-semibold mb-2">צור חבילה חדשה</h3>
      <div className="flex gap-4 mb-4 flex-wrap">
        <input
          type="text"
          placeholder="שם"
          value={newPackage.name}
          onChange={(e) =>
            setNewPackage({ ...newPackage, name: e.target.value })
          }
          className="border p-2 flex-1 min-w-[120px]"
        />
        <input
          type="number"
          placeholder="מחיר"
          value={newPackage.price}
          onChange={(e) =>
            setNewPackage({ ...newPackage, price: Number(e.target.value) })
          }
          className="border p-2 w-32"
        />
        <input
          type="number"
          placeholder="כמות SMS"
          value={newPackage.smsAmount}
          onChange={(e) =>
            setNewPackage({ ...newPackage, smsAmount: Number(e.target.value) })
          }
          className="border p-2 w-32"
        />
        <button
          onClick={handleCreate}
          className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
        >
          צור חבילה
        </button>
      </div>
    </div>
  );
}
