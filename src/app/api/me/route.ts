import { NextResponse } from "next/server";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export async function GET() {
  const profile = await getCallerProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  const supabase = createSupabaseServerClient();

  // Player view: their own 5 stages joined with their progress.
  const { data: stages, error } = await supabase
    .from("stages")
    .select("id, order_index, label, max_attempts, cooldown_seconds, passcode_hash")
    .eq("owner_user_id", profile.id)
    .order("order_index", { ascending: true });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: progressRows } = await supabase
    .from("stage_progress")
    .select("stage_id, attempts_used, solved, locked_until")
    .eq("user_id", profile.id)
    .in("stage_id", stageIds.length > 0 ? stageIds : ["00000000-0000-0000-0000-000000000000"]);

  const progressByStage = new Map(
    (progressRows ?? []).map((p) => [p.stage_id, p] as const),
  );

  const now = Date.now();
  const sanitized = (stages ?? []).map((s) => {
    const p = progressByStage.get(s.id);
    const lockedUntilMs = p?.locked_until ? new Date(p.locked_until).getTime() : 0;
    const onCooldown = lockedUntilMs > now;
    return {
      id: s.id,
      order_index: s.order_index,
      label: s.label,
      max_attempts: s.max_attempts,
      cooldown_seconds: s.cooldown_seconds,
      passcode_set: !!s.passcode_hash,
      attempts_used: p?.attempts_used ?? 0,
      attempts_remaining: Math.max(0, s.max_attempts - (p?.attempts_used ?? 0)),
      solved: !!p?.solved,
      seconds_remaining: onCooldown ? Math.ceil((lockedUntilMs - now) / 1000) : 0,
    };
  });

  return NextResponse.json({
    profile: {
      id: profile.id,
      email: profile.email,
      display_name: profile.display_name,
      slot_number: profile.slot_number,
      is_admin: profile.is_admin,
    },
    stages: sanitized,
  });
}
