import { Guest } from "../types/types";

export function isPhoneNumberDuplicate(
  phone: string,
  guestsList: Guest[],
  displayList: Guest[]
): boolean {
  return (
    guestsList.some((g) => g.phone === phone) ||
    displayList.some((g) => g.phone === phone)
  );
}
