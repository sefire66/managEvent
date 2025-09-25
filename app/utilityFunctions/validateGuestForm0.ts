// utils/validateGuestForm.ts

import { Guest } from "../types/types";

export function isValidPhone(phone: string): boolean {
  return /^05\d{8}$/.test(phone);
}

export function validateGuestForm(
  guest: Partial<Guest>,
  existingGuests: Guest[]
): { valid: boolean; error?: string } {
  if (!guest.name?.trim()) {
    return { valid: false, error: "נא למלא שם" };
  }

  if (!guest.phone?.trim()) {
    return { valid: false, error: "נא למלא טלפון" };
  }

  if (!isValidPhone(guest.phone)) {
    return {
      valid: false,
      error: "מספר הטלפון חייב להכיל 10 ספרות ולהתחיל ב-05",
    };
  }

  const isDuplicate = existingGuests.some(
    (g) => g.phone === guest.phone
  );

  if (isDuplicate) {
    return { valid: false, error: "מספר הטלפון כבר קיים ברשימה" };
  }

  return { valid: true };
}
