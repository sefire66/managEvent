// app/invite/[guestId]/page.tsx
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache";
import { getGuestById } from "@/lib/getGuestById";
import { getEventById } from "@/lib/getEventById";
import RsvpView from "../../components/RsvpView";

export const revalidate = 0;

type SearchParams = Record<string, string | string[] | undefined>;

// **שים לב**: הטיפוסים כאן מותאמים למה ש-.next/types מצפה לו אצלך:
// params?: Promise<...>, searchParams?: Promise<...>
type PageProps = {
  params?: Promise<{ guestId: string }>;
  searchParams?: Promise<SearchParams>;
};

const first = (v: string | string[] | undefined) =>
  Array.isArray(v) ? v[0] : v;

export default async function InvitePage({ params, searchParams }: PageProps) {
  noStore();

  // התאמה לטיפוסי ה-Promise הגנרטיביים
  const p = params ? await params : ({} as { guestId?: string });
  const sp: SearchParams = searchParams ? await searchParams : {};

  const guestId = p.guestId;
  if (!guestId) return notFound();

  const guest = await getGuestById(guestId);
  if (!guest) return notFound();

  const event = guest.eventId ? await getEventById(guest.eventId) : null;
  if (!event) return notFound();

  // פרמטרי פריוויו מה-URL
  const previewMode = first(sp.preview) === "1";
  const rawHide = first(sp.hideDetails);
  const rawRatio = first(sp.imageRatio);
  const cb = first(sp.cb); // cache bust לתמונה

  const previewHideDetails =
    rawHide === "true" || rawHide === "1"
      ? true
      : rawHide === "false"
        ? false
        : undefined;

  const previewImageRatio =
    rawRatio === "16:9" || rawRatio === "4:3"
      ? (rawRatio as "16:9" | "4:3")
      : rawRatio === "auto"
        ? "auto"
        : undefined;

  const design = previewMode
    ? {
        hideDetails:
          previewHideDetails ?? event.preferences?.hideDetails ?? false,
        imageRatio:
          previewImageRatio ?? event.preferences?.imageRatio ?? "auto",
        cacheBust: cb,
      }
    : {
        hideDetails: event.preferences?.hideDetails ?? false,
        imageRatio: event.preferences?.imageRatio ?? "auto",
      };

  return (
    <RsvpView guest={guest} event={event} readOnly={false} design={design} />
  );
}
