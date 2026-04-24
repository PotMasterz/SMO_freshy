import Link from "next/link";
import { redirect } from "next/navigation";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import LogoutButton from "../play/LogoutButton";
import PlayerRowActions from "./PlayerRowActions";

export const dynamic = "force-dynamic";

export default async function AdminHome() {
  const profile = await getCallerProfile();
  if (!profile) redirect("/login");
  if (!profile.is_admin) redirect("/play");

  type PlayerRow = {
    id: string;
    username: string;
    display_name: string | null;
    slot_number: number | null;
  };

  const admin = createSupabaseAdminClient();
  const { data: players } = (await admin
    .from("profiles")
    .select("id, username, display_name, slot_number")
    .eq("is_admin", false)
    .order("slot_number", { ascending: true })) as { data: PlayerRow[] | null };

  const playersBySlot = new Map<number, PlayerRow>();
  for (const p of players ?? []) {
    if (p.slot_number != null) playersBySlot.set(p.slot_number, p);
  }

  // Solved counts + total stage counts per player
  const ids = (players ?? []).map((p) => p.id);
  const solvedCounts = new Map<string, number>();
  const totalCounts = new Map<string, number>();
  if (ids.length > 0) {
    const { data: stages } = await admin
      .from("stages")
      .select("owner_user_id")
      .in("owner_user_id", ids);
    for (const row of stages ?? []) {
      totalCounts.set(row.owner_user_id, (totalCounts.get(row.owner_user_id) ?? 0) + 1);
    }
    const { data: progress } = await admin
      .from("stage_progress")
      .select("user_id, solved")
      .in("user_id", ids);
    for (const row of progress ?? []) {
      if (row.solved) solvedCounts.set(row.user_id, (solvedCounts.get(row.user_id) ?? 0) + 1);
    }
  }

  return (
    <main className="mx-auto max-w-4xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">SMO Freshy · Admin</p>
          <h1 className="mt-1 text-3xl font-bold">Players</h1>
          <p className="mt-1 text-sm text-slate-400">
            7 player slots. Click into a player to set their 4-digit passcodes.
          </p>
        </div>
        <LogoutButton />
      </header>

      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/60">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900 text-xs uppercase tracking-wider text-slate-400">
            <tr>
              <th className="px-4 py-3">Slot</th>
              <th className="px-4 py-3">Username</th>
              <th className="px-4 py-3">Display name</th>
              <th className="px-4 py-3">Solved</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {[1, 2, 3, 4, 5, 6, 7].map((slot) => {
              const p = playersBySlot.get(slot);
              return (
                <tr key={slot}>
                  <td className="px-4 py-3 font-mono text-slate-400">#{slot}</td>
                  {p ? (
                    <>
                      <td className="px-4 py-3 font-mono font-medium">{p.username}</td>
                      <td className="px-4 py-3 text-slate-300">{p.display_name || "—"}</td>
                      <td className="px-4 py-3">
                        <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
                          {solvedCounts.get(p.id) ?? 0} / {totalCounts.get(p.id) ?? 0}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right">
                        <PlayerRowActions playerId={p.id} />
                      </td>
                    </>
                  ) : (
                    <>
                      <td className="px-4 py-3 italic text-slate-500" colSpan={3}>
                        empty
                      </td>
                      <td className="px-4 py-3 text-right">
                        <Link
                          href={`/admin/players/new?slot=${slot}`}
                          className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400"
                        >
                          Create player
                        </Link>
                      </td>
                    </>
                  )}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </main>
  );
}
