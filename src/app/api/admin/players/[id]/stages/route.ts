import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();

  const { data: player, error: playerErr } = await admin
    .from("profiles")
    .select("id, email, display_name, slot_number, is_admin")
    .eq("id", params.id)
    .single();
  if (playerErr || !player) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: stages, error: stagesErr } = await admin
    .from("stages")
    .select("id, order_index, label, max_attempts, cooldown_seconds, passcode_hash")
    .eq("owner_user_id", params.id)
    .order("order_index", { ascending: true });
  if (stagesErr) return NextResponse.json({ error: stagesErr.message }, { status: 500 });

  const { data: progress } = await admin
    .from("stage_progress")
    .select("stage_id, attempts_used, solved, locked_until")
    .eq("user_id", params.id);

  const progressByStage = new Map(
    (progress ?? []).map((p) => [p.stage_id, p] as const),
  );

  const sanitized = (stages ?? []).map((s) => ({
    id: s.id,
    order_index: s.order_index,
    label: s.label,
    max_attempts: s.max_attempts,
    cooldown_seconds: s.cooldown_seconds,
    passcode_set: !!s.passcode_hash,
    progress: progressByStage.get(s.id) ?? null,
  }));

  return NextResponse.json({ player, stages: sanitized });
}
