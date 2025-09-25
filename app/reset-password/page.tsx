// app/reset-password/page.tsx
"use client";

import { useState, useMemo } from "react"; // [CHANGE] נוספה useMemo לחישוב הודעת החוזק
import { useSearchParams } from "next/navigation";
import { Eye, EyeOff, CheckCircle, Loader2 } from "lucide-react";
import { validatePasswordStrength } from "../utilityFunctions/validatePasswordStrength"; // [CHANGE] ייבוא פונקציית ולידציה משותפת

export default function ResetPasswordPage() {
  const searchParams = useSearchParams();
  const token = searchParams.get("token") || "";

  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  // [CHANGE] בדיקת חוזק סיסמה בזמן אמת עם הפונקציה המשותפת
  const passwordError = useMemo(
    () => (newPassword ? validatePasswordStrength(newPassword) : null),
    [newPassword]
  );

  // [CHANGE] מנגנון הפעלה לכפתור שליחה: מותר לשלוח רק כשהכול תקין
  const canSubmit =
    !!token &&
    !!newPassword &&
    !!confirmPassword &&
    newPassword === confirmPassword &&
    !passwordError &&
    !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!token) {
      setMessage("קישור לא תקין (חסר token)");
      return;
    }

    if (passwordError) {
      // [CHANGE] חסימת שליחה אם הסיסמה לא עומדת במדיניות
      setMessage(passwordError);
      return;
    }

    if (newPassword !== confirmPassword) {
      setMessage("הסיסמאות אינן תואמות");
      return;
    }

    setLoading(true);
    setMessage("");

    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await res.json();

      if (res.ok) {
        setMessage("✅ הסיסמה אופסה בהצלחה, מפנים להתחברות...");
        setNewPassword("");
        setConfirmPassword("");
        // [CHANGE] פתיחה אוטומטית של מודאל התחברות דרך ה-Navbar (באמצעות פרמטר URL)
        window.location.href = "/?reset=success";
      } else {
        setMessage(`❌ ${data.error || "שגיאה באיפוס הסיסמה"}`);
      }
    } catch {
      setMessage("❌ בעיה בשרת, נסה שוב מאוחר יותר");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-md mx-auto mt-40 p-6 border rounded-lg shadow ">
      <h1 className="text-xl font-bold mb-4">איפוס סיסמה</h1>

      {message && (
        <div className="flex items-center gap-2 p-3 mb-4 rounded-md bg-gray-50 border text-gray-700">
          <CheckCircle className="w-5 h-5" />
          <span className="font-semibold">{message}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* סיסמה חדשה */}
        <div>
          <label className="block text-sm mb-1">סיסמה חדשה</label>
          <div className="relative">
            <input
              type={showNew ? "text" : "password"}
              className="w-full border p-2 rounded pl-10 pr-2" // [CHANGE] pl-10 כי האייקון עבר לשמאל
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowNew((s) => !s)}
              className="absolute inset-y-0 left-2 top-0 flex items-center text-gray-500 hover:text-gray-700" // [CHANGE] האייקון עבר לצד שמאל
              tabIndex={-1}
              aria-label={showNew ? "הסתר סיסמה" : "הצג סיסמה"}
            >
              {showNew ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {passwordError && (
            <p className="text-xs text-red-600 mt-1">
              {passwordError} {/* [CHANGE] הצגת שגיאת חוזק סיסמה */}
            </p>
          )}
        </div>

        {/* אישור סיסמה */}
        <div>
          <label className="block text-sm mb-1">אישור סיסמה</label>
          <div className="relative">
            <input
              type={showConfirm ? "text" : "password"}
              className="w-full border p-2 rounded pl-10 pr-2" // [CHANGE] pl-10 כי האייקון עבר לשמאל
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              autoComplete="new-password"
              required
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute inset-y-0 left-2 top-0 flex items-center text-gray-500 hover:text-gray-700" // [CHANGE] האייקון עבר לצד שמאל
              tabIndex={-1}
              aria-label={showConfirm ? "הסתר סיסמה" : "הצג סיסמה"}
            >
              {showConfirm ? (
                <EyeOff className="w-5 h-5" />
              ) : (
                <Eye className="w-5 h-5" />
              )}
            </button>
          </div>
          {confirmPassword && newPassword !== confirmPassword && (
            <p className="text-xs text-red-600 mt-1">
              הסיסמאות אינן תואמות {/* [CHANGE] הודעת שגיאה לאי-התאמה */}
            </p>
          )}
        </div>

        <button
          type="submit"
          disabled={!canSubmit} // [CHANGE] כפתור ננעל עד שכל התנאים מתקיימים
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700 disabled:opacity-50 flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="animate-spin w-4 h-4" />}
          {loading ? "שולח..." : "אפס סיסמה"}
        </button>
      </form>
    </div>
  );
}
