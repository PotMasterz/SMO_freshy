import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { usernameToEmail } from "@/lib/auth";

export const dynamic = "force-dynamic";

/** Only allow alphanumeric, underscore, hyphen; 3–20 chars. */
function isValidUsername(v: string): boolean {
  return /^[a-zA-Z0-9_-]{3,20}$/.test(v);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();

  const { data: players, error } = await admin
    .from("profiles")
    .select("id, username, display_name, slot_number, is_admin, created_at")
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

  let body: { username?: string; password?: string; display_name?: string; slot_number?: number };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const username = (body.username ?? "").trim();
  const password = body.password ?? "";
  const displayName = (body.display_name ?? "").trim();
  const slot = Number(body.slot_number);

  if (!isValidUsername(username)) {
    return NextResponse.json({ error: "username_invalid" }, { status: 400 });
  }
  if (!password || password.length < 6) {
    return NextResponse.json({ error: "password_too_short" }, { status: 400 });
  }
  if (!Number.isInteger(slot) || slot < 1 || slot > 7) {
    return NextResponse.json({ error: "invalid_slot" }, { status: 400 });
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

  // Make sure the username is free.
  const { data: existingUser } = await admin
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();
  if (existingUser) {
    return NextResponse.json({ error: "username_taken" }, { status: 409 });
  }

  // Create the Supabase auth user with an internal synthetic email.
  const internalEmail = usernameToEmail(username);
  const { data: created, error: createErr } = await admin.auth.admin.createUser({
    email: internalEmail,
    password,
    email_confirm: true,
  });
  if (createErr || !created.user) {
    return NextResponse.json({ error: createErr?.message ?? "create_failed" }, { status: 400 });
  }

  const userId = created.user.id;

  // The on-insert trigger creates the profile row. Update it with username + slot.
  const { error: updErr } = await admin
    .from("profiles")
    .update({
      username,
      display_name: displayName || username,
      slot_number: slot,
      is_admin: false,
    })
    .eq("id", userId);
  if (updErr) {
    return NextResponse.json({ error: updErr.message }, { status: 500 });
  }

  // Seed 5 empty stages for the new player.
  const stageRows = [1, 2, 3, 4, 5, 6].map((order_index) => ({
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
