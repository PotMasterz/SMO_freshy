import { createSupabaseServerClient } from "@/lib/supabase/server";

export type CallerProfile = {
  id: string;
  email: string;
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
    .select("id, email, display_name, slot_number, is_admin")
    .eq("id", user.id)
    .single();

  if (!profile) {
    return {
      id: user.id,
      email: user.email ?? "",
      display_name: null,
      slot_number: null,
      is_admin: false,
    };
  }
  return profile as CallerProfile;
}
