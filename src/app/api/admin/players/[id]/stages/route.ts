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
    .select("id, username, display_name, slot_number, is_admin")
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

export async function POST(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();

  const { data: player } = await admin
    .from("profiles")
    .select("id")
    .eq("id", params.id)
    .eq("is_admin", false)
    .single();
  if (!player) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const { data: existing } = await admin
    .from("stages")
    .select("order_index")
    .eq("owner_user_id", params.id)
    .order("order_index", { ascending: false })
    .limit(1)
    .single();

  const nextIndex = (existing?.order_index ?? 0) + 1;
  if (nextIndex > 20) {
    return NextResponse.json({ error: "max_20_riddles" }, { status: 400 });
  }

  const { data: stage, error } = await admin
    .from("stages")
    .insert({
      owner_user_id: params.id,
      order_index: nextIndex,
      label: `Riddle ${nextIndex}`,
      passcode_hash: null,
      max_attempts: 3,
      cooldown_seconds: 60,
    })
    .select("id, order_index, label")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ stage });
}
