// app/reception/notice/page.tsx
import ReceptionNotice from "../../components/ReceptionNotice";

type SearchParams = {
  title?: string | string[];
  subtitle?: string | string[];
  qrSrc?: string | string[];
  b?: string | string[]; // bullets: אפשר להופיע כמה פעמים ?b=...
};

export default function Page({ searchParams }: { searchParams: SearchParams }) {
  const normalize = (v: string | string[] | undefined) =>
    Array.isArray(v) ? v[0] : v || "";

  const title = normalize(searchParams.title) || "ברוכים הבאים לאירוע";
  const subtitle = normalize(searchParams.subtitle) || "";
  const qrSrc = normalize(searchParams.qrSrc) || "";

  const bulletsRaw = searchParams.b
    ? Array.isArray(searchParams.b)
      ? searchParams.b
      : [searchParams.b]
    : [];
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
