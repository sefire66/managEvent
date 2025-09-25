"use client";

import { useEffect, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";

export default function VerifyEmailPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const [status, setStatus] = useState<"loading" | "success" | "error">(
    "loading"
  );
  const [message, setMessage] = useState("");

  useEffect(() => {
    const token = searchParams.get("token");

    if (!token) {
      setStatus("error");
      setMessage("טוקן לא סופק.");
      return;
    }

    const verifyEmail = async () => {
      try {
        const res = await fetch(`/api/verify-email?token=${token}`);
        const data = await res.json();

        if (res.ok) {
          setStatus("success");
          setMessage("האימייל אומת בהצלחה! יש להתחבר מחדש...");
          setTimeout(() => {
            router.push("/?verified=true"); // ⬅️ מפנה לדף הבית עם הפרמטר
          }, 3000);
        } else {
          setStatus("error");
          setMessage(data.error || "שגיאה באימות.");
        }
      } catch (err) {
        setStatus("error");
        setMessage("שגיאה בשרת.");
      }
    };

    verifyEmail();
  }, [searchParams, router]);

  return (
    <div
      className="min-h-[70vh] flex items-center justify-center px-4"
      dir="rtl"
    >
      <div className="bg-white rounded-lg shadow-md p-6 max-w-md w-full text-center space-y-4">
        <h1 className="text-xl font-bold">
          {status === "loading" && "מאמת את האימייל שלך..."}
          {status === "success" && "הצלחה!"}
          {status === "error" && "אופס..."}
        </h1>
        <p
          className={`text-${status === "error" ? "red" : "green"}-600 font-semibold`}
        >
          {message}
        </p>
      </div>
    </div>
  );
}
