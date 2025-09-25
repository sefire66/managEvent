"use client";

import { useEffect, useState } from "react";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

export default function Pricing() {
  const [packages, setPackages] = useState<PackageType[]>([]);

  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then(setPackages)
      .catch(console.error);
  }, []);

  const handleSelectPackage = (pkg: string) => {
    alert(`בחרת בחבילת ${pkg} – כאן תוכל להפנות לתשלום או לשדרוג.`);
  };

  return (
    <div className="max-w-4xl mx-auto p-6 text-center">
      <h2 className="text-3xl font-bold mb-8">מחירים</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {packages.map((pkg) => (
          <div
            key={pkg._id}
            className="border rounded p-6 shadow flex flex-col justify-between"
          >
            <div>
              <h3 className="text-xl font-semibold mb-2">{pkg.name}</h3>
              <p className="text-gray-700 mb-2">
                עד {pkg.smsAmount} הודעות SMS
              </p>
              <p className="text-2xl font-bold mb-4">
                {pkg.price === 0 ? "חינם" : `₪${pkg.price}`}
              </p>
            </div>
            <button
              onClick={() => handleSelectPackage(pkg.name)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded mt-auto"
            >
              בחר חבילה
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
