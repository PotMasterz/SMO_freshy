import Link from "next/link";
import { redirect, notFound } from "next/navigation";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import EditStageRow from "./EditStageRow";

export const dynamic = "force-dynamic";

export default async function EditPlayerPage({
  params,
}: {
  params: { id: string };
}) {
  const profile = await getCallerProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/play");

  const admin = createSupabaseAdminClient();

  const { data: player } = await admin
    .from("profiles")
    .select("id, username, display_name, slot_number, is_admin")
    .eq("id", params.id)
    .single();
  if (!player || player.is_admin) notFound();

  const { data: stages } = await admin
    .from("stages")
    .select("id, order_index, label, max_attempts, cooldown_seconds, passcode_hash")
    .eq("owner_user_id", params.id)
    .order("order_index", { ascending: true });

  return (
    <main className="mx-auto max-w-2xl px-4 py-10">
      <div className="mb-6">
        <Link href="/admin" className="text-xs text-slate-400 hover:text-white">
          ← All players
        </Link>
      </div>

      <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">
        Slot #{player.slot_number}
      </p>
      <h1 className="mt-1 text-3xl font-bold">{player.display_name || player.username}</h1>
      <p className="mt-1 font-mono text-sm text-slate-400">@{player.username}</p>

      <p className="mt-6 rounded-lg border border-slate-800 bg-slate-900/40 p-4 text-sm text-slate-300">
        Set or change the 4-digit passcode for each of this player&apos;s 5 riddles. The riddle
        text itself stays on paper — the website only checks the codes. <br />
        <span className="text-slate-400">
          Changing a passcode resets that riddle&apos;s progress for the player.
        </span>
      </p>

      <div className="mt-6 space-y-4">
        {(stages ?? []).map((s) => (
          <EditStageRow
            key={s.id}
            stage={{
              id: s.id,
              order_index: s.order_index,
              label: s.label,
              max_attempts: s.max_attempts,
              cooldown_seconds: s.cooldown_seconds,
              passcode_set: !!s.passcode_hash,
            }}
          />
        ))}
      </div>
    </main>
  );
}
