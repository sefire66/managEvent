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

            {/* טופס תשלום PayPal אמיתי */}
            <form
              action="https://www.paypal.com/cgi-bin/webscr"
              method="post"
              target="_blank"
              className="mt-auto"
            >
              <input type="hidden" name="cmd" value="_xclick" />
              <input
                type="hidden"
                name="business"
                value="eventnceleb@gmail.com" // 🔁 כאן שים את המייל של PayPal האמיתי שלך
              />
              <input type="hidden" name="item_name" value={pkg.name} />
              <input type="hidden" name="amount" value={pkg.price} />
              <input type="hidden" name="currency_code" value="ILS" />

              <input
                type="hidden"
                name="return"
                value={`${process.env.NEXT_PUBLIC_SITE_URL}/successPay`}

                //   value="https://your-site.com/successPay"
              />

              <input
                type="hidden"
                name="cancel_return"
                value={`${process.env.NEXT_PUBLIC_SITE_URL}/cancel`}
              />
              <button
                type="submit"
                className="bg-yellow-500 hover:bg-yellow-600 text-white px-4 py-2 rounded w-full"
              >
                תשלום עם PayPal או כרטיס אשראי
              </button>
            </form>
          </div>
        ))}
      </div>
    </div>
  );
}
