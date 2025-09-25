import { notFound } from "next/navigation";
import { getGuestById } from "@/lib/getGuestById";
import { getEventById } from "@/lib/getEventById";
import RsvpView from "../../components/RsvpView";

type Props = {
  params: { guestId: string };
};

export default async function InvitePage({ params }: Props) {
  const guest = await getGuestById(params.guestId);
  if (!guest) return notFound();

  const event = guest.eventId ? await getEventById(guest.eventId) : null;
  if (!event) return notFound();

  return <RsvpView guest={guest} event={event} readOnly={false} />;
}
