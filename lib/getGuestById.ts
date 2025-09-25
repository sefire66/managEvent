import { connectToDatabase } from "./mongodb";
import GuestModel from "@/models/Guest"; // ✅ Mongoose model
import type { Guest } from "../app/types/types"; // ✅ TypeScript type

export async function getGuestById(guestId: string): Promise<Guest | null> {
  await connectToDatabase();

  const guest = (await GuestModel.findOne({ _id: guestId }).lean()) as {
    _id: any;
  } | null;

  if (!guest) return null;

  return {
    ...guest,
    _id: guest._id.toString(),
  } as Guest;
}
