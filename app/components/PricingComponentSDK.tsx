"use client";

import Script from "next/script";
import { useEffect, useState } from "react";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

// מאפשר שימוש ב־window.paypal בלי ש-TSC יתלונן
declare global {
  interface Window {
    paypal: any;
  }
}

export default function Pricing() {
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(
    null
  );
  const [isSdkReady, setIsSdkReady] = useState(false); // ✅ חדש

  // טוען חבילות
  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then(setPackages)
      .catch(console.error);
  }, []);

  // ✅ מאזין לאירוע טעינת SDK
  const handleScriptLoad = () => {
    console.log("✅ PayPal SDK loaded");
    setIsSdkReady(true);
  };

  // ✅ יצירת כפתור PayPal כש־SDK מוכן ונבחרה חבילה
  useEffect(() => {
    if (!selectedPackage || !isSdkReady || !window.paypal) return;

    console.log("⚙️ יוצר כפתור עבור:", selectedPackage.name);

    window.paypal
      .Buttons({
        createOrder: (data: any, actions: any) => {
          return actions.order.create({
            purchase_units: [
              {
                amount: {
                  value: selectedPackage.price.toString(),
                  currency_code: "ILS",
                },
                description: selectedPackage.name,
              },
            ],
          });
        },
        onApprove: async (data: any, actions: any) => {
          const details = await actions.order.capture();
          const transactionId = details.id;
          const itemName = selectedPackage.name;
          const amount = selectedPackage.price;

          console.log("✅ תשלום אושר:", { transactionId, itemName, amount });

          const res = await fetch("/api/payments/save", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ transactionId, itemName, amount }),
          });

          const result = await res.json();
          if (result.success) {
            alert("🎉 התשלום הצליח! כמות ההודעות שלך עודכנה");
          } else {
            console.error("❌ שגיאה מהשרת בשמירה:", result);
            alert("❌ שגיאה בשמירת התשלום");
          }

          setSelectedPackage(null); // הסתרת הכפתור לאחר תשלום
        },
        onError: (err: any) => {
          console.error("❌ שגיאה ב־PayPal:", err);
          alert("אירעה שגיאה במהלך התשלום");
        },
      })
      .render("#paypal-button-container");
  }, [selectedPackage, isSdkReady]);

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
              onClick={() => {
                console.log("🟡 נבחרה חבילה:", pkg.name);
                setSelectedPackage(pkg);
              }}
              className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full mt-auto"
            >
              תשלום עם PayPal
            </button>
          </div>
        ))}
      </div>

      {selectedPackage && (
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-2">
            תשלום עבור: {selectedPackage.name}
          </h3>
          <div id="paypal-button-container" className="flex justify-center" />
        </div>
      )}

      {/* ✅ טעינת SDK עם האזנה לטעינה */}
      <Script
        src={`https://www.paypal.com/sdk/js?client-id=AdI_CfAsHTJKThj4v_Gog7COwitTMaCd_osV5pDwrTZ2omty4GTJcUAHY66-waJl9lQJu2z7bptqt4O4&currency=ILS&locale=he_IL`}
        strategy="afterInteractive"
        onLoad={handleScriptLoad}
      />
    </div>
  );
}
