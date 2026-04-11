import { NextResponse } from "next/server";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { isFourDigits, verifyPasscode } from "@/lib/passcode";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const profile = await getCallerProfile();
  if (!profile) {
    return NextResponse.json({ error: "unauthenticated" }, { status: 401 });
  }

  let body: { guess?: unknown };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  if (!isFourDigits(body?.guess)) {
    return NextResponse.json({ error: "invalid_guess" }, { status: 400 });
  }
  const guess = body.guess as string;

  // Service-role client so the per-attempt update is atomic and bypasses RLS edge cases.
  const admin = createSupabaseAdminClient();

  const { data: stage, error: stageErr } = await admin
    .from("stages")
    .select("id, owner_user_id, passcode_hash, max_attempts, cooldown_seconds")
    .eq("id", params.id)
    .single();

  if (stageErr || !stage) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  if (stage.owner_user_id !== profile.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!stage.passcode_hash) {
    return NextResponse.json({ status: "not_ready" });
  }

  // Load existing progress (if any).
  const { data: existing } = await admin
    .from("stage_progress")
    .select("attempts_used, solved, locked_until")
    .eq("user_id", profile.id)
    .eq("stage_id", stage.id)
    .maybeSingle();

  if (existing?.solved) {
    return NextResponse.json({ status: "already_solved" });
  }

  const now = Date.now();
  if (existing?.locked_until && new Date(existing.locked_until).getTime() > now) {
    const seconds_remaining = Math.ceil(
      (new Date(existing.locked_until).getTime() - now) / 1000,
    );
    return NextResponse.json({ status: "cooldown", seconds_remaining });
  }

  const isCorrect = await verifyPasscode(guess, stage.passcode_hash);

  // Audit log every attempt (best-effort).
  await admin.from("stage_attempts").insert({
    user_id: profile.id,
    stage_id: stage.id,
    is_correct: isCorrect,
  });

  if (isCorrect) {
    await admin.from("stage_progress").upsert(
      {
        user_id: profile.id,
        stage_id: stage.id,
        attempts_used: 0,
        solved: true,
        solved_at: new Date().toISOString(),
        locked_until: null,
      },
      { onConflict: "user_id,stage_id" },
    );
    return NextResponse.json({ status: "correct" });
  }

  const newAttempts = (existing?.attempts_used ?? 0) + 1;
  if (newAttempts >= stage.max_attempts) {
    const lockedUntil = new Date(now + stage.cooldown_seconds * 1000).toISOString();
    await admin.from("stage_progress").upsert(
      {
        user_id: profile.id,
        stage_id: stage.id,
        attempts_used: 0,
        solved: false,
        locked_until: lockedUntil,
      },
      { onConflict: "user_id,stage_id" },
    );
    return NextResponse.json({
      status: "locked",
      seconds_remaining: stage.cooldown_seconds,
    });
  }

  await admin.from("stage_progress").upsert(
    {
      user_id: profile.id,
      stage_id: stage.id,
      attempts_used: newAttempts,
      solved: false,
      locked_until: null,
    },
    { onConflict: "user_id,stage_id" },
  );
  return NextResponse.json({
    status: "wrong",
    attempts_remaining: stage.max_attempts - newAttempts,
  });
}
