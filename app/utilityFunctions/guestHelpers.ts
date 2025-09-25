import type { Guest } from "../types/types";

export function updateGuestInList(
  guestsList: Guest[],
  displayList: Guest[],
  id: string,
  updatedGuest: Partial<Guest>,
  sortActive: boolean
): { updatedGuests: Guest[]; updatedDisplayList: Guest[] } {
  const updatedGuests = guestsList.map((guest) =>
    guest._id === id ? { ...guest, ...updatedGuest } : guest
  );

  const updatedDisplayList = sortActive
    ? displayList.map((guest) =>
        guest._id === id ? { ...guest, ...updatedGuest } : guest
      )
    : updatedGuests;

  return { updatedGuests, updatedDisplayList };
}
