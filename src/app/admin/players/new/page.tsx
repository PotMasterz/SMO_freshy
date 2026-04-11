import { redirect } from "next/navigation";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import NewPlayerForm from "./NewPlayerForm";

export const dynamic = "force-dynamic";

export default async function NewPlayerPage({
  searchParams,
}: {
  searchParams: { slot?: string };
}) {
  const profile = await getCallerProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/play");

  const admin = createSupabaseAdminClient();
  const { data: taken } = await admin
    .from("profiles")
    .select("slot_number")
    .not("slot_number", "is", null);
  const takenSlots = new Set((taken ?? []).map((p) => p.slot_number));
  const freeSlots = [1, 2, 3, 4, 5, 6, 7].filter((s) => !takenSlots.has(s));

  const initialSlot = searchParams.slot ? Number(searchParams.slot) : freeSlots[0];

  return (
    <main className="mx-auto max-w-lg px-4 py-10">
      <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">SMO Freshy · Admin</p>
      <h1 className="mt-1 text-3xl font-bold">Create player</h1>
      <p className="mt-1 text-sm text-slate-400">
        The player will sign in with this email and password.
      </p>
      <div className="mt-6 rounded-2xl border border-slate-800 bg-slate-900/60 p-6">
        <NewPlayerForm freeSlots={freeSlots} initialSlot={initialSlot} />
      </div>
    </main>
  );
}
