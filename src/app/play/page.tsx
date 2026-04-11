import { redirect } from "next/navigation";
import { getCallerProfile } from "@/lib/auth";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import StageCard, { type StageDTO } from "./StageCard";
import LogoutButton from "./LogoutButton";

export const dynamic = "force-dynamic";

export default async function PlayPage() {
  const profile = await getCallerProfile();
  if (!profile) redirect("/login");
  if (profile.is_admin) redirect("/admin");

  const supabase = createSupabaseServerClient();

  const { data: stages } = await supabase
    .from("stages")
    .select("id, order_index, label, max_attempts, cooldown_seconds, passcode_hash")
    .eq("owner_user_id", profile.id)
    .order("order_index", { ascending: true });

  const stageIds = (stages ?? []).map((s) => s.id);
  const { data: progressRows } = await supabase
    .from("stage_progress")
    .select("stage_id, attempts_used, solved, locked_until")
    .eq("user_id", profile.id)
    .in("stage_id", stageIds.length > 0 ? stageIds : ["00000000-0000-0000-0000-000000000000"]);
  const progressByStage = new Map((progressRows ?? []).map((p) => [p.stage_id, p] as const));

  const now = Date.now();
  const dtos: StageDTO[] = (stages ?? []).map((s) => {
    const p = progressByStage.get(s.id);
    const lockedUntilMs = p?.locked_until ? new Date(p.locked_until).getTime() : 0;
    const onCooldown = lockedUntilMs > now;
    return {
      id: s.id,
      order_index: s.order_index,
      label: s.label,
      max_attempts: s.max_attempts,
      cooldown_seconds: s.cooldown_seconds,
      passcode_set: !!s.passcode_hash,
      attempts_used: p?.attempts_used ?? 0,
      attempts_remaining: Math.max(0, s.max_attempts - (p?.attempts_used ?? 0)),
      solved: !!p?.solved,
      seconds_remaining: onCooldown ? Math.ceil((lockedUntilMs - now) / 1000) : 0,
    };
  });

  const solvedCount = dtos.filter((d) => d.solved).length;

  return (
    <main className="mx-auto max-w-3xl px-4 py-10">
      <header className="mb-8 flex items-start justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.3em] text-indigo-400">SMO Freshy</p>
          <h1 className="mt-1 text-3xl font-bold">
            {profile.display_name || profile.email}
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Solved {solvedCount} / {dtos.length} riddles
          </p>
        </div>
        <LogoutButton />
      </header>

      {dtos.length === 0 ? (
        <p className="rounded-lg border border-slate-800 bg-slate-900/60 p-6 text-center text-slate-400">
          No riddles set up yet. Ask your organiser.
        </p>
      ) : (
        <div className="space-y-4">
          {dtos.map((dto) => (
            <StageCard key={dto.id} initial={dto} />
          ))}
        </div>
      )}
    </main>
  );
}
