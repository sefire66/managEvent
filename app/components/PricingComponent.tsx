"use client";

import Script from "next/script";
import { useEffect, useState } from "react";
import LoginModal from "../components/LoginModal";
import RegisterModal from "../components/RegisterModal";
import { useSession } from "next-auth/react";
import { Loader2 } from "lucide-react";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

declare global {
  interface Window {
    paypal: any;
  }
}

export default function Pricing() {
  const { data: session } = useSession();
  const [packages, setPackages] = useState<PackageType[]>([]);
  const [selectedPackage, setSelectedPackage] = useState<PackageType | null>(
    null
  );
  const [purchaseResult, setPurchaseResult] = useState<{
    oldBalance: number;
    newBalance: number;
    smsAdded: number;
  } | null>(null);
  const [usedFreePackage, setUsedFreePackage] = useState(false);

  const [showLogin, setShowLogin] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // useEffect(() => {
  //   fetch("/api/packages")
  //     .then((res) => res.json())
  //     .then(setPackages)
  //     .catch(console.error);
  // }, []);

  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then((data) => {
        setPackages(data);
        setIsLoading(false); // כאן מפסיקים להציג את מסך הטעינה
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false); // גם במקרה של שגיאה
      });
  }, []);

  useEffect(() => {
    fetch("/api/payments/used-free")
      .then((res) => res.json())
      .then((data) => {
        setUsedFreePackage(data.used);
      })
      .catch((err) => {
        console.error("שגיאה בבדיקת חבילה חינמית:", err);
      });
  }, []);

  useEffect(() => {
    if (selectedPackage && window.paypal) {
      const container = document.getElementById("paypal-button-container");
      if (container) container.innerHTML = "";

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

            const res = await fetch("/api/payments/save", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ transactionId, itemName, amount }),
            });

            const result = await res.json();
            if (result.success) {
              const newBalance = result.smsBalance;
              const smsAdded = selectedPackage.smsAmount;
              setPurchaseResult({
                oldBalance: newBalance - smsAdded,
                newBalance,
                smsAdded,
              });
            } else {
              alert("❌ שגיאה בשמירת התשלום");
            }

            setSelectedPackage(null);
          },
          onError: (err: any) => {
            console.error("❌ שגיאה ב־PayPal:", err);
            alert("אירעה שגיאה במהלך התשלום");
          },
        })
        .render("#paypal-button-container");
    }
  }, [selectedPackage]);

  const handleFreePackage = async (pkg: PackageType) => {
    const res = await fetch("/api/payments/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        transactionId: "free",
        itemName: pkg.name,
        amount: 0,
      }),
    });

    const result = await res.json();
    if (result.success) {
      alert("🎉 החבילה החינמית נוספה לחשבונך!");
      setUsedFreePackage(true);
      setPurchaseResult({
        oldBalance: result.smsBalance - pkg.smsAmount,
        newBalance: result.smsBalance,
        smsAdded: pkg.smsAmount,
      });
    } else {
      alert("❌ אינך יכול להשתמש שוב בחבילה החינמית.");
    }
  };

  const handlePackageClick = (pkg: PackageType) => {
    if (!session) {
      setShowLogin(true);
      return;
    }

    if (pkg.price === 0) {
      handleFreePackage(pkg);
    } else {
      setSelectedPackage(pkg);
    }
  };

  // if (isLoading) {
  //   return (
  //     <div className="flex items-center justify-center h-screen text-xl rtl">
  //       <span className="animate-pulse">טוען את עמוד המחירים...</span>
  //     </div>
  //   );
  // }

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-xl rtl">
        <Loader2 className="animate-spin w-12 h-12 text-blue-500 mb-4" />
        <span className="text-lg">טוען את עמוד המחירים...</span>
      </div>
    );
  }

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

            {pkg.price > 0 ? (
              <button
                onClick={() => handlePackageClick(pkg)}
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full mt-auto"
              >
                תשלום עם PayPal
              </button>
            ) : usedFreePackage ? (
              <p className="text-red-600 font-semibold mt-auto text-center">
                היה בשימוש
              </p>
            ) : (
              <button
                onClick={() => handlePackageClick(pkg)}
                className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full mt-auto"
              >
                קבל חבילת חינם
              </button>
            )}
          </div>
        ))}
      </div>

      {selectedPackage && (
        <div className="mt-10">
          <h3 className="text-lg font-bold mb-2">
            תשלום עבור: {selectedPackage.name}
          </h3>
          <div className="flex justify-center">
            <div id="paypal-button-container" />
          </div>
        </div>
      )}

      {purchaseResult && (
        <div className="bg-gray-100 border mt-10 p-4 rounded text-right space-y-2 max-w-md mx-auto">
          <p>
            💬 יתרה קודמת: <strong>{purchaseResult.oldBalance}</strong>
          </p>
          <p>
            🧾 נוספו הודעות: <strong>{purchaseResult.smsAdded}</strong>
          </p>
          <p>
            📲 יתרה חדשה: <strong>{purchaseResult.newBalance}</strong>
          </p>
        </div>
      )}

      <Script
        src={`https://www.paypal.com/sdk/js?client-id=AdI_CfAsHTJKThj4v_Gog7COwitTMaCd_osV5pDwrTZ2omty4GTJcUAHY66-waJl9lQJu2z7bptqt4O4&currency=ILS&locale=he_IL&disable-funding=card`}
        strategy="afterInteractive"
      />

      <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
        onSwitchToForgot={() => {
          setShowLogin(false);
          setForgotOpen(true);
        }}
      />

      {/* <LoginModal
        open={showLogin}
        onClose={() => setShowLogin(false)}
        onSwitchToRegister={() => {
          setShowLogin(false);
          setShowRegister(true);
        }}
      /> */}
      <RegisterModal
        open={showRegister}
        onClose={() => setShowRegister(false)}
        onSwitchToLogin={() => {
          setShowRegister(false);
          setShowLogin(true);
        }}
      />
    </div>
  );
}
