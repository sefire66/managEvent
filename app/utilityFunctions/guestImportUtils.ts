import type { Guest } from "../types/types";

export type GuestRow = Guest & {
  isInvalid?: boolean;
  isDuplicate?: boolean;
};

export const isValidPhone = (phone: string): boolean => {
  return /^05\d{8}$/.test(phone);
};

export const validateGuest = (guest: Guest): boolean => {
  return guest.name?.trim() !== "" && isValidPhone(guest.phone?.trim() ?? "");
};

export const prepareGuestPreview = (guests: Guest[]): GuestRow[] => {
  const seen = new Set<string>();
  return guests.map((guest) => {
    const isInvalid = !validateGuest(guest);
    const isDuplicate = !isInvalid && seen.has(guest.phone?.trim() ?? "");

    if (!isInvalid) {
      seen.add(guest.phone.trim());
    }

    return {
      ...guest,
      isInvalid,
      isDuplicate,
    };
  });
};

export const filterValidGuests = (guests: GuestRow[]): Guest[] => {
  return guests.filter((g) => !g.isInvalid && !g.isDuplicate);
};
