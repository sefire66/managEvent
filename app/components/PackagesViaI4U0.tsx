"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";
import LoginModal from "../components/LoginModal";
import RegisterModal from "../components/RegisterModal";
import { Loader2 } from "lucide-react";
import { quickCreateAndOpenPayment } from "@/lib/I4U/quickCreateAndOpenPayment";

// ⬇️ חדש: יבוא כלי Billing Profile לשימוש חוזר
import {
  fetchBillingProfiles,
  pickDefaultBillingProfile,
  extractVatFromProfile,
  type BillingProfileUI,
} from "@/lib/billingProfile";

type PackageType = {
  _id: string;
  name: string;
  price: number;
  smsAmount: number;
};

type CreateLinkResponse = {
  ok: boolean;
  token?: string | null;
  shortUrl?: string | null; // I4U ClearingRedirectUrl
  error?: string;
};

export default function PackagesViaI4U() {
  const { data: session, status } = useSession();

  const [packages, setPackages] = useState<PackageType[]>([]);
  const [usedFreePackage, setUsedFreePackage] = useState(false);

  // ⬇️ מצב טעינת פרופיל חיוב
  const [loadingVat, setLoadingVat] = useState(true);
  const [billingProfile, setBillingProfile] = useState<BillingProfileUI | null>(
    null
  );
  const [billingProfileVatRate, setBillingProfileVatRate] = useState<
    number | null
  >(null);

  const [isLoading, setIsLoading] = useState(true);
  const [creating, setCreating] = useState<string | null>(null); // packageId under creation
  const [purchaseResult, setPurchaseResult] = useState<{
    oldBalance: number;
    newBalance: number;
    smsAdded: number;
  } | null>(null);

  const [showLogin, setShowLogin] = useState(false);
  const [showRegister, setShowRegister] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);

  // סגירת מודאל אם הפכנו למחוברים
  useEffect(() => {
    if (status === "authenticated") {
      setShowLogin(false);
      setShowRegister(false);
    }
  }, [status]);

  // טוען חבילות
  useEffect(() => {
    fetch("/api/packages")
      .then((res) => res.json())
      .then((data) => {
        setPackages(data);
        setIsLoading(false);
      })
      .catch((err) => {
        console.error(err);
        setIsLoading(false);
      });
  }, []);

  // בדיקת שימוש בחבילה חינמית
  useEffect(() => {
    fetch("/api/payments/used-free")
      .then((res) => res.json())
      .then((data) => setUsedFreePackage(data.used))
      .catch((err) => console.error("שגיאה בבדיקת חבילה חינמית:", err));
  }, []);

  // ⬇️ טעינת Billing Profile פעם אחת (ללא userId מהלקוח)
  useEffect(() => {
    const controller = new AbortController();
    (async () => {
      try {
        setLoadingVat(true);
        const list = await fetchBillingProfiles({ signal: controller.signal });
        const chosen = pickDefaultBillingProfile(list);
        setBillingProfile(chosen ?? null);
        setBillingProfileVatRate(extractVatFromProfile(chosen));
      } catch (e) {
        console.error("שגיאה בשליפת פרופיל חיוב:", e);
      } finally {
        setLoadingVat(false);
      }
    })();
    return () => controller.abort();
  }, []);

  // חבילה חינמית — זהה ללוגיקה הקיימת שלך
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

  // יצירת לינק סליקה מאובטח ל-I4U והפניה
  async function createHostedLinkAndRedirect(pkg: PackageType) {
    // 🔒 חסם נגד דאבל-קליק
    if (creating) return;

    try {
      setCreating(pkg._id);

      // פרטים מה־session
      const ownerUserId =
        (session as any)?.user?.id ||
        (session as any)?.user?._id ||
        (session as any)?.user?.userId;

      const payerName =
        (session as any)?.user?.name || (session as any)?.user?.fullName || "";

      const payerEmail = (session as any)?.user?.email || "";

      const payerPhone =
        (session as any)?.user?.phone ||
        (session as any)?.user?.mobile ||
        (session as any)?.user?.tel ||
        "0500000000";

      // דרישות מינימום
      if (!ownerUserId) {
        setShowLogin(true);
        return;
      }
      if (!payerEmail) {
        alert("נדרש אימייל בחשבון כדי להמשיך בתשלום.");
        return;
      }

      // ⬇️ הקריאה המהירה — כולל BillingProfile אם נטען
      await quickCreateAndOpenPayment({
        ownerUserId,
        payerName,
        payerEmail,
        payerPhone,
        title: pkg.name, // דינמי
        amount: pkg.price, // דינמי
        billingProfileId: billingProfile?._id,
        billingProfileVatRate: billingProfileVatRate ?? undefined,
        // returnUrl, callbackUrl, creditCardCompanyType, apiKey...
      });
    } catch (e: any) {
      console.error(e);
      alert(e?.message || "שגיאה ביצירת קישור תשלום");
    } finally {
      setCreating(null);
    }
  }

  const handlePackageClick = (pkg: PackageType) => {
    // אם עדיין טוען את ה-session או ה-BillingProfile — לא עושים כלום
    if (status === "loading" || loadingVat) return;

    // אם לא מחובר — מודאל התחברות
    if (!session) {
      setShowLogin(true);
      return;
    }

    // חבילה חינמית
    if (pkg.price === 0) {
      handleFreePackage(pkg);
      return;
    }

    // חבילה בתשלום — יצירת לינק והפניה
    createHostedLinkAndRedirect(pkg);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-screen text-xl rtl">
        <Loader2 className="animate-spin w-12 h-12 text-blue-500 mb-4" />
        <span className="text-lg">טוען את עמוד המחירים...</span>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto p-6 text-center" dir="rtl">
      <h2 className="text-3xl font-bold mb-8">מחירים</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-6">
        {packages.map((pkg) => {
          const isCreatingThis = creating === pkg._id;
          const disableBtn =
            isCreatingThis ||
            status === "loading" ||
            showLogin ||
            showRegister ||
            loadingVat; // ⬅️ נטרל לחצן עד שטוען פרופיל חיוב

          return (
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
                  type="button"
                  onClick={() => handlePackageClick(pkg)}
                  disabled={disableBtn}
                  className={`text-white px-4 py-2 rounded w-full mt-auto ${
                    disableBtn
                      ? "bg-blue-300 cursor-not-allowed"
                      : "bg-blue-600 hover:bg-blue-700"
                  }`}
                >
                  {isCreatingThis
                    ? "יוצר קישור…"
                    : loadingVat
                      ? "טוען פרופיל חיוב…"
                      : "תשלום בכרטיס אשראי"}
                </button>
              ) : usedFreePackage ? (
                <p className="text-red-600 font-semibold mt-auto text-center">
                  היה בשימוש
                </p>
              ) : (
                <button
                  type="button"
                  onClick={() => handlePackageClick(pkg)}
                  disabled={status === "loading"}
                  className="bg-green-500 hover:bg-green-600 text-white px-4 py-2 rounded w-full mt-auto"
                >
                  קבל חבילת חינם
                </button>
              )}
            </div>
          );
        })}
      </div>

      {/* סיכום לאחר חבילה חינמית */}
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

      {/* מודלים של התחברות/הרשמה */}
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
