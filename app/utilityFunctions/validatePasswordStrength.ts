export function validatePasswordStrength(password: string): string | null {
  // תנאים בסיסיים – אפשר לשנות בהתאם למה שיש אצלך בהרשמה
  if (password.length < 8) {
    return "הסיסמה חייבת להיות באורך של לפחות 8 תווים";
  }
  if (!/[A-Z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות גדולה אחת באנגלית";
  }
  if (!/[a-z]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות אות קטנה אחת באנגלית";
  }
  if (!/[0-9]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות ספרה אחת";
  }
  if (!/[!@#$%^&*]/.test(password)) {
    return "הסיסמה חייבת להכיל לפחות תו מיוחד אחד (!@#$%^&*)";
  }
  return null; // ✔️ תקין
}
