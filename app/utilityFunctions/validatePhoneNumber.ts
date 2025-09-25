export function validatePhoneNumber(
  phone: string,
  setError: (msg?: string) => void
): boolean {
  const isValid = /^05\d{8}$/.test(phone);

  if (!isValid) {
    setError("מספר הטלפון חייב להכיל 10 ספרות ולהתחיל ב-05");
    return false;
  }

  setError(undefined); // clear any existing error
  return true;
}
