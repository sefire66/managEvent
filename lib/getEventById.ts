import { connectToDatabase } from "./mongodb";
import EventModel from "@/models/Event";
import type { EventDetails } from "../app/types/types";

export async function getEventById(
  eventId: string
): Promise<EventDetails | null> {
  await connectToDatabase();

  const rawEvent = await EventModel.findOne({ _id: eventId }).lean();

  if (!rawEvent) return null;

  const event = rawEvent as any; // or: as unknown as EventDetails

  return {
    ...event,
    _id: event._id?.toString?.() ?? "",
  } as EventDetails;
}
