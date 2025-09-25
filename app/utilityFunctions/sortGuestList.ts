import type { Guest } from "../types/types";

function parseDateSafe(v: unknown): number {
  if (!v || typeof v !== "string") return 0; // ריק נחשב הכי ישן
  const t = Date.parse(v);
  return Number.isNaN(t) ? 0 : t;
}

export function sortGuestList(
  guests: Guest[],
  field: keyof Guest,
  direction: "asc" | "desc"
): Guest[] {
  const dir = direction === "asc" ? 1 : -1;

  return [...guests].sort((a, b) => {
    // טיפול מיוחד בתאריך ה-SMS האחרון
    if (field === "lastSms") {
      const ta = parseDateSafe(a.lastSms);
      const tb = parseDateSafe(b.lastSms);
      if (ta !== tb) return (ta - tb) * dir;

      // השוואת נפילה (tie-breaker) לשם כדי לשמור יציבות
      return (a.name || "").localeCompare(b.name || "", "he") * dir;
    }

    const aVal = a[field] as any;
    const bVal = b[field] as any;

    // שניהם מספרים
    if (typeof aVal === "number" && typeof bVal === "number") {
      if (aVal !== bVal) return (aVal - bVal) * dir;
      return (a.name || "").localeCompare(b.name || "", "he") * dir;
    }

    // שניהם מחרוזות
    if (typeof aVal === "string" && typeof bVal === "string") {
      const cmp = aVal.localeCompare(bVal, "he", { sensitivity: "base" });
      if (cmp !== 0) return cmp * dir;
      return (a.name || "").localeCompare(b.name || "", "he") * dir;
    }

    // טיפול בערכים ריקים/שונים בטיפוס: ריקים תמיד "קטנים" יותר
    const aEmpty = aVal === undefined || aVal === null || aVal === "";
    const bEmpty = bVal === undefined || bVal === null || bVal === "";
    if (aEmpty !== bEmpty) return aEmpty ? -1 * dir : 1 * dir;

    // אם הגענו לכאן – טופל כבר, ניפול לשם
    return (a.name || "").localeCompare(b.name || "", "he") * dir;
  });
}
