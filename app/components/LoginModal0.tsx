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

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchToRegister: () => void;
};

export default function LoginModal({
  open,
  onClose,
  onSwitchToRegister,
}: Props) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const router = useRouter();
  const searchParams = useSearchParams();
  const [showSuccessDialog, setShowSuccessDialog] = useState(false);

  // 📨 ממלא אוטומטית את כתובת המייל אם קיימת ב-URL
  useEffect(() => {
    const emailFromUrl = searchParams.get("email");
    if (emailFromUrl) {
      setEmail(emailFromUrl);
    }
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    const res = await signIn("credentials", {
      redirect: false,
      email,
      password,
    });

    if (res?.ok) {
      const session = await getSession();
      onClose();
      alert("ההתחברות הצליחה");

      if (
        session?.user?.role === "admin" ||
        session?.user?.role === "super-admin"
      ) {
        router.push("/adminDashboard");
      } else {
        router.push("/dashboard");
      }
    } else {
      if (res?.error === "EMAIL_NOT_VERIFIED") {
        router.push(`/resend-verification?email=${encodeURIComponent(email)}`);
        onClose();
      } else {
        setError("שגיאה בהתחברות. בדוק אימייל וסיסמה.");
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>התחברות</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="אימייל"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
          <Input
            type="password"
            placeholder="סיסמה"
            required
            value={password}
            onChange={(e) => setPassword(e.target.value)}
          />

          {error && (
            <p className="text-sm text-red-600 text-right font-semibold">
              {error}
            </p>
          )}

          <Button type="submit" className="w-full">
            התחבר
          </Button>
        </form>

        <p className="text-sm mt-4 text-center">
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
        </p>
      </DialogContent>
    </Dialog>
  );
}
