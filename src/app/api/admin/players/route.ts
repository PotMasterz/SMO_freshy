import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();

  const { data: players, error } = await admin
    .from("profiles")
    .select("id, email, display_name, slot_number, is_admin, created_at")
    .eq("is_admin", false)
    .order("slot_number", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Solved counts per player.
  const ids = (players ?? []).map((p) => p.id);
  const solvedCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: progress } = await admin
      .from("stage_progress")
      .select("user_id, solved")
      .in("user_id", ids);
    for (const row of progress ?? []) {
      if (row.solved) {
        solvedCounts.set(row.user_id, (solvedCounts.get(row.user_id) ?? 0) + 1);
      }
    }
  }

  const enriched = (players ?? []).map((p) => ({
    ...p,
    solved_count: solvedCounts.get(p.id) ?? 0,
  }));

  return NextResponse.json({ players: enriched });
}

export async function POST(request: Request) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { email?: string; password?: string; display_name?: string; slot_number?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const email = (body.email ?? "").trim();
  const password = body.password ?? "";
  const displayName = (body.display_name ?? "").trim();
  const slot = Number(body.slot_number);

  if (!email || !password || !Number.isInteger(slot) || slot < 1 || slot > 7) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }
  if (password.length < 6) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();

  // Make sure the slot is free.
  const { data: existingSlot } = await admin
    .from("profiles")
    .select("id")
    .eq("slot_number", slot)
    .maybeSingle();
  if (existingSlot) {
    return NextResponse.json({ error: "slot_taken" }, { status: 409 });
  }

  // Create the auth user.
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { display_name: displayName },
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "create_failed" }, { status: 400 });
  }

  const userId = created.user.id;

  // The on-insert trigger creates the profile row. Update it with display_name + slot.
  const { error: updErr } = await admin
    .from("profiles")
    .update({ display_name: displayName || email, slot_number: slot, is_admin: false })
    .eq("id", userId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Seed 5 empty stages for the new player.
  const stageRows = [1, 2, 3, 4, 5].map((order_index) => ({
    owner_user_id: userId,
    order_index,
    label: `Riddle ${order_index}`,
    passcode_hash: null as string | null,
    max_attempts: 3,
    cooldown_seconds: 60,
  }));
  const { error: stagesErr } = await admin.from("stages").insert(stageRows);
  if (stagesErr) {
    return NextResponse.json({ error: stagesErr.message }, { status: 500 });
  }

  return NextResponse.json({ id: userId });
}
