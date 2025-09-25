"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { CheckCircle, XCircle } from "lucide-react";

export default function ResendVerificationPage() {
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState<
    "idle" | "success" | "error" | "loading"
  >("idle");
  const [message, setMessage] = useState("");
  const [cooldown, setCooldown] = useState(0);

  const searchParams = useSearchParams();

  // מילוי אימייל מה-URL
  useEffect(() => {
    const emailParam = searchParams.get("email");
    if (emailParam) setEmail(emailParam);
  }, [searchParams]);

  // טיימר קירור בין שליחות
  useEffect(() => {
    if (cooldown > 0) {
      const timer = setTimeout(() => setCooldown(cooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [cooldown]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cooldown > 0) return;

    setStatus("loading");
    setMessage("");
    setCooldown(20); // 30 שניות המתנה

    const res = await fetch("/api/resend-verification", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });

    const data = await res.json();

    if (res.ok) {
      setStatus("success");
      setMessage(data.message);
    } else {
      setStatus("error");
      setMessage(data.error || "שגיאה בשליחה מחדש");
    }
  };

  return (
    <div
      className="min-h-[70vh] flex flex-col justify-center items-center px-4"
      dir="rtl"
    >
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-6 space-y-4 mt-30">
        <h1 className="text-2xl font-bold text-center text-gray-800">
          החשבון שלך עדיין לא אומת
        </h1>
        <p className="text-center text-gray-600 text-sm leading-6">
          כדי להשלים את ההרשמה ולהיכנס למערכת, עליך לאמת את כתובת האימייל שלך.
          <br />
          לחץ/י על הכפתור למטה כדי לשלוח שוב את מייל האימות.
          <br />
          אם לא קיבלת את ההודעה, בדוק/י את תיקיית הספאם.
        </p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <Input
            type="email"
            placeholder="כתובת אימייל"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="text-right"
          />

          <Button
            type="submit"
            className="w-full"
            disabled={status === "loading" || cooldown > 0}
          >
            {status === "loading"
              ? "שולח..."
              : cooldown > 0
                ? `נסה שוב בעוד ${cooldown} שניות`
                : "שלח מייל אימות מחדש"}
          </Button>
        </form>

        {status === "success" && (
          <div className="flex items-center justify-center gap-2 text-green-700 font-semibold">
            <CheckCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}

        {status === "error" && (
          <div className="flex items-center justify-center gap-2 text-red-600 font-semibold">
            <XCircle className="w-5 h-5" />
            <span>{message}</span>
          </div>
        )}
      </div>
    </div>
  );
}
