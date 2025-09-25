import { Guest } from "../types/types";

export function validateGuestForm(
  guest: Partial<Guest>,
  guestsList: Guest[]
): {
  valid: boolean;
  errors: { name?: string; phone?: string };
} {
  const errors: { name?: string; phone?: string } = {};

  if (!guest.name?.trim()) {
    errors.name = "שם הוא שדה חובה";
  }

  const phoneRegex = /^05\d{8}$/;
  if (!guest.phone?.trim()) {
    errors.phone = "מספר טלפון הוא שדה חובה";
  } else if (!phoneRegex.test(guest.phone)) {
    errors.phone = "מספר טלפון לא חוקי";
  } else if (guestsList.some((g) => g.phone === guest.phone)) {
    errors.phone = "מספר טלפון כבר קיים ברשימה";
  }

  return {
    valid: Object.keys(errors).length === 0,
    errors,
  };
}
