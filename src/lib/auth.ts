import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CallerProfile = {
  id: string;
  username: string;
  display_name: string | null;
  slot_number: number | null;
  is_admin: boolean;
};

/**
 * Loads the currently signed-in user along with their profile row.
 * Returns null if there's no session.
 */
export async function getCallerProfile(): Promise<CallerProfile | null> {
  const supabase = createSupabaseServerClient();
  const { data: userRes } = await supabase.auth.getUser();
  const user = userRes.user;
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, username, display_name, slot_number, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    // Fallback: derive username from internal email (username@smo.game)
    const username = (user.email ?? "").split("@")[0];
    return {
      id: user.id,
      username,
      display_name: null,
      slot_number: null,
      is_admin: false,
    };
  }
  return profile as CallerProfile;
}

/** Converts a plain username into the internal Supabase Auth email. */
export function usernameToEmail(username: string): string {
  return `${username.toLowerCase().trim()}@smo.game`;
}
