// lib/billingProfile.ts

export type BillingProfileUI = {
  _id: string;
  title?: string | null;
  isDefault?: boolean | null;
  lastUsedAt?: string | null;
  currency?: string | null;
  vatRate?: number | null;
  vatPercent?: number | null;
  vat?: number | null;
  businessName?: string | null;
  buisinessName?: string | null; // תמיכה בטעות כתיב
};

/**
 * שליפת פרופילי חיוב מה-API (ללא userId).
 * השרת צריך להסיק את המשתמש מה-session בצד השרת.
 */
export async function fetchBillingProfiles(opts?: {
  endpoint?: string;         // דיפולט: "/api/billing-profile?list=1"
  signal?: AbortSignal;
}): Promise<BillingProfileUI[]> {
  const endpoint = opts?.endpoint ?? "/api/billing-profile?list=1";
  const res = await fetch(endpoint, { cache: "no-store", signal: opts?.signal });

  let data: any = null;
  try { data = await res.json(); } catch { /* ignore */ }

  if (!res.ok) {
    throw new Error(data?.error || "שגיאה בשליפת פרופילי חיוב");
  }

  if (Array.isArray(data)) return data as BillingProfileUI[];
  if (data && typeof data === "object") return [data as BillingProfileUI];
  return [];
}

/** בחירת פרופיל דיפולטי: isDefault > lastUsedAt (חדש יותר) > הראשון */
export function pickDefaultBillingProfile(list: BillingProfileUI[]): BillingProfileUI | null {
  if (!list?.length) return null;
  return (
    list.find(p => p.isDefault) ||
    [...list].sort((a, b) => {
      const ta = a.lastUsedAt ? Date.parse(a.lastUsedAt) : 0;
      const tb = b.lastUsedAt ? Date.parse(b.lastUsedAt) : 0;
      return tb - ta;
    })[0] ||
    list[0] ||
    null
  );
}

/** מחלץ מע״מ מהפרופיל (vatRate/vatPercent/vat) ומחזיר אחוז שלם 0–100 או null */
export function extractVatFromProfile(p?: BillingProfileUI | null): number | null {
  if (!p) return null;
  const candidates = [p.vatRate, p.vatPercent, p.vat]
    .filter((x): x is number => typeof x === "number" && isFinite(x));
  if (!candidates.length) return null;
  const v = Math.round(candidates[0]!);
  return Math.max(0, Math.min(100, v));
}

/** שם תצוגה נוח לפרופיל: businessName → buisinessName → title → _id */
export function billingProfileDisplayName(p: BillingProfileUI): string {
  return p.businessName || p.buisinessName || p.title || p._id;
}
