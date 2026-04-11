import bcrypt from "bcryptjs";

export function isFourDigits(value: unknown): value is string {
  return typeof value === "string" && /^\d{4}$/.test(value);
}

export async function hashPasscode(passcode: string): Promise<string> {
  if (!isFourDigits(passcode)) {
    throw new Error("Passcode must be exactly 4 digits");
  }
  return bcrypt.hash(passcode, 10);
}

export async function verifyPasscode(passcode: string, hash: string): Promise<boolean> {
  if (!isFourDigits(passcode)) return false;
  return bcrypt.compare(passcode, hash);
}
