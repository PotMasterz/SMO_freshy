import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/requireAdmin";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function DELETE(
  _request: Request,
  { params }: { params: { id: string } },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = createSupabaseAdminClient();
  const { error } = await admin.auth.admin.deleteUser(params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ ok: true });
}
