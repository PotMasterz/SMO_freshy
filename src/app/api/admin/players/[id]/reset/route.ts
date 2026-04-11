import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(
  request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  let body: { stageId?: string } = {};
  try {
    body = await request.json();
  } catch {
    /* empty body is fine */
  }

  const admin = createSupabaseAdminClient();
  let query = admin
    .from("stage_progress")
    .delete()
    .eq("user_id", params.id);
  if (body.stageId) {
    query = query.eq("stage_id", body.stageId);
  }
  const { error } = await query;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
