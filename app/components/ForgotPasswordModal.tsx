"use client";

import { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import { CheckCircle, Loader2 } from "lucide-react";

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export default function ForgotPasswordModal({
  open,
  onClose,
  onSwitchToLogin,
}: Props) {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [loading, setLoading] = useState(false);

  // איפוס הודעות בכל פתיחה מחדש
  useEffect(() => {
    if (open) {
      setEmail("");
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

    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccess("אם האימייל קיים במערכת, נשלח אליך לינק לאיפוס סיסמה");
      } else {
        setError(data.error || "שגיאה בשליחת הבקשה");
      }
    } catch {
      setError("בעיה בשרת, נסה שוב מאוחר יותר");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>שכחתי סיסמה</DialogTitle>
        </DialogHeader>

        {/* הודעת הצלחה */}
        {success && (
          <div className="flex items-center gap-2 p-3 rounded-md bg-green-50 border border-green-200 text-green-700">
            <CheckCircle className="w-5 h-5" />
            <span className="font-semibold">{success}</span>
          </div>
        )}

        {/* הודעת שגיאה */}
        {error && (
          <p className="text-sm text-red-600 text-right font-semibold">
            {error}
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            placeholder="האימייל שלך"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={loading}
          />

          <Button
            type="submit"
            className="w-full flex items-center justify-center gap-2"
            disabled={loading}
          >
            {loading && <Loader2 className="animate-spin w-4 h-4" />}
            {loading ? "שולח..." : "שלח לינק לאיפוס"}
          </Button>
        </form>

        <p className="text-sm mt-4 text-center">
          נזכרת בסיסמה?{" "}
          <button
            onClick={() => {
              onClose();
              onSwitchToLogin();
            }}
            className="text-blue-600 underline"
          >
            התחבר כאן
          </button>
        </p>
      </DialogContent>
    </Dialog>
  );
}
