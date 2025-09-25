export async function sendSmsDemo(to: string, message: string) {
  console.log(`📨 Sending SMS to ${to}: ${message}`);
  return { success: true };
}
