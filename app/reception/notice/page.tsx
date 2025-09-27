// app/reception/notice/page.tsx
import ReceptionNotice from "../../components/ReceptionNotice";

type SearchParams = {
  title?: string | string[];
  subtitle?: string | string[];
  qrSrc?: string | string[];
  b?: string | string[]; // bullets: אפשר להופיע כמה פעמים ?b=...
};

type PageProps = {
  // בהתאם לטיפוסים שנוצרים אצלך ב-.next/types: Promise בלבד (או undefined)
  searchParams?: Promise<SearchParams>;
};

const normalize = (v?: string | string[]) =>
  Array.isArray(v) ? v[0] : (v ?? "");

export default async function Page({ searchParams }: PageProps) {
  // searchParams יכול להיות undefined או Promise<SearchParams>
  const sp: SearchParams = searchParams ? await searchParams : {};

  const title = normalize(sp.title) || "ברוכים הבאים לאירוע";
  const subtitle = normalize(sp.subtitle) || "";
  const qrSrc = normalize(sp.qrSrc) || "";

  const bulletsRaw = sp.b ? (Array.isArray(sp.b) ? sp.b : [sp.b]) : [];
  const bullets = bulletsRaw.map((s) => s.trim()).filter(Boolean);

  return (
    <ReceptionNotice
      title={title}
      subtitle={subtitle}
      bullets={bullets}
      qrSrc={qrSrc}
    />
  );
}
