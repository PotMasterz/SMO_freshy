import { NextResponse } from "next/server";
import { getCallerProfile, type CallerProfile } from "@/lib/auth";

export async function requireAdmin(): Promise<
  { ok: true; profile: CallerProfile } | { ok: false; response: NextResponse }
> {
  const profile = await getCallerProfile();
  if (!profile) {
    return { ok: false, response: NextResponse.json({ error: "unauthenticated" }, { status: 401 }) };
  }
  if (!profile.is_admin) {
    return { ok: false, response: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { ok: true, profile };
}
