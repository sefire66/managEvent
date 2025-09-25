"use client";

import { useState, useEffect } from "react";
import { signIn, getSession } from "next-auth/react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { CheckCircle, Loader2, Eye, EyeOff } from "lucide-react"; // 🟧 ייבוא אייקונים

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
  onSwitchToForgot: () => void;
};

export default function LoginModal({
  open,
  onClose,
  onSwitchToRegister,
  onSwitchToForgot,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false); // 🟧 מצב להראות/להסתיר סיסמה
  const router = useRouter();
  const searchParams = useSearchParams();

  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) setEmail(emailFromUrl);
  }, [searchParams]);

  useEffect(() => {
    if (open) {
      setError("");
      setSuccess("");
      setLoading(false);
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    setError("");
    setSuccess("");
    setLoading(true);

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.ok) {
      const session = await getSession();
      setSuccess("ההתחברות הצליחה!");
      setTimeout(() => {
        onClose();
        if (
          session?.user?.role === "admin" ||
          session?.user?.role === "super-admin"
        ) {
          router.push("/adminDashboard");
        } else {
          router.push("/dashboard");
        }
      }, 700);
    } else {
      if (res?.error === "EMAIL_NOT_VERIFIED") {
        onClose();
        router.push(`/resend-verification?email=${encodeURIComponent(email)}`);
      } else {
        setError("שגיאה בהתחברות. בדוק אימייל וסיסמה.");
      }
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>התחברות</DialogTitle>
        </DialogHeader>

        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {error && (
          <p className="text-sm text-red-600 text-right font-semibold">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="אימייל"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          {/* 🟧 שדה סיסמה עם כפתור הצגה/הסתרה */}
          <div className="relative">
            <Input
              type={showPassword ? "text" : "password"} // 🟧 משנה לפי מצב
              placeholder="סיסמה"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
            />
            <button
              type="button"
              className="absolute inset-y-0 left-2 flex items-center text-gray-500 hover:text-gray-700"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {/* 🟧 סוף שדה הסיסמה */}

          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            {loading ? "מתחבר..." : "התחבר"}
          </Button>
        </form>

        <div className="flex items-center justify-between text-sm mt-4">
          <button
            onClick={() => {
              onClose();
              onSwitchToForgot();
            }}
            className="text-blue-600 underline"
          >
            שכחתי סיסמה?
          </button>

          <span>
            אין לך חשבון?{" "}
            <button
              onClick={() => {
                onClose();
                onSwitchToRegister();
              }}
              className="text-blue-600 underline"
            >
              הירשם כאן
            </button>
          </span>
        </div>
      </DialogContent>
    </Dialog>
  );
}
