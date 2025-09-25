"use client";

import { useEffect, useState, useMemo } from "react"; // [CHANGE] useMemo לחישוב הודעת חוזק
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "../components/ui/dialog";
import { Input } from "../components/ui/input";
import { Button } from "../components/ui/button";
import LegalModal from "./LegalModal";
import { Loader2, CheckCircle, XCircle, Eye, EyeOff } from "lucide-react";
import { validatePasswordStrength } from "../utilityFunctions/validatePasswordStrength"; // [CHANGE] ייבוא פונקציית הולידציה

type Props = {
  open: boolean;
  onClose: () => void;
  onSwitchToLogin: () => void;
};

export default function RegisterModal({
  open,
  onClose,
  onSwitchToLogin,
}: Props) {
  const [form, setForm] = useState({
    name: "",
    email: "",
    phone: "",
    password: "",
  });

  const [acceptedTerms, setAcceptedTerms] = useState(false);
  const [legalOpen, setLegalOpen] = useState(false);

  const [loading, setLoading] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [showPassword, setShowPassword] = useState(false);

  // [CHANGE] חישוב הודעת חוזק/שגיאת סיסמה בזמן אמת לפי הפונקציה המשותפת
  const passwordError = useMemo(
    () => (form.password ? validatePasswordStrength(form.password) : null),
    [form.password]
  );

  // [CHANGE] להגביל שליחה עד שהכול תקין
  const canSubmit =
    !!form.name &&
    !!form.email &&
    !!form.password &&
    acceptedTerms &&
    !passwordError &&
    !loading;

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setErrorMessage("עליך לאשר את תנאי השימוש כדי להירשם");
      return;
    }

    // [CHANGE] חסימת שליחה אם הסיסמה לא עומדת במדיניות
    if (passwordError) {
      setErrorMessage(passwordError);
      return;
    }

    setLoading(true);
    setSuccessMessage("");
    setErrorMessage("");

    try {
      const res = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...form, role: "client" }),
      });

      const data = await res.json();

      if (res.ok) {
        setSuccessMessage("ההרשמה הצליחה! נשלח אימייל לאימות לכתובת שלך.");
        setForm({ name: "", email: "", phone: "", password: "" });
        setAcceptedTerms(false);
      } else {
        setErrorMessage(data.error || "שגיאה בהרשמה");
      }
    } catch (err) {
      setErrorMessage("שגיאה בלתי צפויה, נסה שוב");
    }

    setLoading(false);
  };

  useEffect(() => {
    if (open) {
      setForm({ name: "", email: "", phone: "", password: "" });
      setAcceptedTerms(false);
      setSuccessMessage("");
      setErrorMessage("");
      setLoading(false);
      setShowPassword(false);
    }
  }, [open]);

  return (
    <>
      <Dialog open={open} onOpenChange={onClose}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>הרשמת לקוח חדש</DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-3">
            <Input
              name="name"
              placeholder="שם"
              required
              onChange={handleChange}
              value={form.name}
            />
            <Input
              name="email"
              type="email"
              placeholder="אימייל"
              required
              onChange={handleChange}
              value={form.email}
            />
            <Input
              name="phone"
              placeholder="טלפון"
              onChange={handleChange}
              value={form.phone}
              type="tel"
            />

            {/* סיסמה עם כפתור בצד שמאל */}
            <div className="relative">
              <Input
                name="password"
                type={showPassword ? "text" : "password"}
                placeholder="סיסמה"
                required
                onChange={handleChange}
                value={form.password}
                autoComplete="new-password"
                className="pr-2 pl-10"
              />
              <button
                type="button"
                onClick={() => setShowPassword((s) => !s)}
                className="absolute inset-y-0 left-2 flex items-center text-gray-500 hover:text-gray-700"
                tabIndex={-1}
                aria-label={showPassword ? "הסתר סיסמה" : "הצג סיסמה"}
              >
                {showPassword ? (
                  <EyeOff className="w-5 h-5" />
                ) : (
                  <Eye className="w-5 h-5" />
                )}
              </button>
            </div>

            {/* [CHANGE] הודעת ולידציה מתחת לסיסמה */}
            {form.password && passwordError && (
              <p className="text-xs text-red-600 -mt-2">{passwordError}</p>
            )}

            <label className="text-sm flex items-center space-x-2">
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                required
              />
              <span className="text-right">
                אני מאשר/ת את{" "}
                <button
                  type="button"
                  onClick={() => setLegalOpen(true)}
                  className="text-blue-600 underline"
                >
                  תנאי השימוש ומדיניות הפרטיות
                </button>
              </span>
            </label>

            <Button
              type="submit"
              className="w-full flex items-center justify-center gap-2"
              disabled={!canSubmit} // [CHANGE] נעילה עד שהטופס תקין
            >
              {loading && <Loader2 className="animate-spin w-4 h-4" />}
              {loading ? "נרשם..." : "הירשם"}
            </Button>
          </form>

          {successMessage && (
            <div className="flex items-center justify-center gap-2 mt-4 text-green-700 font-semibold text-lg">
              <CheckCircle className="w-6 h-6 text-green-700" />
              <span>{successMessage}</span>
            </div>
          )}
          {errorMessage && (
            <div className="flex items-center justify-center gap-2 mt-4 text-red-700 font-semibold text-lg">
              <XCircle className="w-6 h-6 text-red-700" />
              <span>{errorMessage}</span>
            </div>
          )}

          <p className="text-sm mt-4 text-center">
            יש לך חשבון?{" "}
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

      <LegalModal open={legalOpen} onClose={() => setLegalOpen(false)} />
    </>
  );
}
