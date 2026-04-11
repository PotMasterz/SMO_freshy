import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { hashPasscode, isFourDigits } from "@/lib/passcode";

export const dynamic = "force-dynamic";

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: {
    label?: string;
    passcode?: string;
    max_attempts?: number;
    cooldown_seconds?: number;
  };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const admin = createSupabaseAdminClient();
  const { data: stage, error: stageErr } = await admin
    .from("stages")
    .select("id, owner_user_id, passcode_hash")
    .eq("id", params.id)
    .single();
  if (stageErr || !stage) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const updates: Record<string, unknown> = { updated_at: new Date().toISOString() };
  let passcodeChanged = false;

  if (typeof body.label === "string") {
    updates.label = body.label.slice(0, 80);
  }
  if (typeof body.max_attempts === "number" && body.max_attempts >= 1 && body.max_attempts <= 20) {
    updates.max_attempts = Math.floor(body.max_attempts);
  }
  if (
    typeof body.cooldown_seconds === "number" &&
    body.cooldown_seconds >= 0 &&
    body.cooldown_seconds <= 3600
  ) {
    updates.cooldown_seconds = Math.floor(body.cooldown_seconds);
  }
  if (typeof body.passcode === "string" && body.passcode.length > 0) {
    if (!isFourDigits(body.passcode)) {
      return NextResponse.json({ error: "passcode_must_be_4_digits" }, { status: 400 });
    }
    updates.passcode_hash = await hashPasscode(body.passcode);
    passcodeChanged = true;
  }

  const { error: updErr } = await admin.from("stages").update(updates).eq("id", stage.id);
  if (updErr) return NextResponse.json({ error: updErr.message }, { status: 500 });

  // KEY BEHAVIOUR: when an admin sets a new passcode, reset the player's progress for that stage
  // so they can crack it again with the new code.
  if (passcodeChanged) {
    await admin
      .from("stage_progress")
      .delete()
      .eq("user_id", stage.owner_user_id)
      .eq("stage_id", stage.id);
  }

  return NextResponse.json({ ok: true, passcode_changed: passcodeChanged });
}
