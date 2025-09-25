// app/invite/[guestId]/page.tsx
import { notFound } from "next/navigation";
import { unstable_noStore as noStore } from "next/cache"; // ביטול קאש לכל בקשה
import { getGuestById } from "@/lib/getGuestById";
import { getEventById } from "@/lib/getEventById";
import RsvpView from "../../components/RsvpView";

export const revalidate = 0; // מבטל ISR לעמוד הזה

type Props = {
  params: { guestId: string };
  searchParams?: Record<string, string | string[] | undefined>;
};

export default async function InvitePage({ params, searchParams }: Props) {
  noStore();

  const guest = await getGuestById(params.guestId);
  if (!guest) return notFound();

  const event = guest.eventId ? await getEventById(guest.eventId) : null;
  if (!event) return notFound();

  // קריאת פרמטרי פריוויו מה-URL (עורך במובייל בתוך iframe)
  const sp = searchParams ?? {};
  const previewMode = sp.preview === "1";

  const rawHide =
    typeof sp.hideDetails === "string" ? sp.hideDetails : undefined;
  const rawRatio =
    typeof sp.imageRatio === "string" ? sp.imageRatio : undefined;
  const cb = typeof sp.cb === "string" ? sp.cb : undefined; // מפתח רענון

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
        cacheBust: cb, // יעבור ל-RsvpView כדי לעקוף קאש של התמונה
      }
    : {
        hideDetails: event.preferences?.hideDetails ?? false,
        imageRatio: event.preferences?.imageRatio ?? "auto",
      };

  return (
    <RsvpView guest={guest} event={event} readOnly={false} design={design} />
  );
}
