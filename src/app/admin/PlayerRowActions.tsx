"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function PlayerRowActions({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function reset() {
    if (!confirm("Reset this player's progress on all 5 riddles?")) return;
    setBusy(true);
    await fetch(`/api/admin/players/${playerId}/reset`, { method: "POST" });
    setBusy(false);
    router.refresh();
  }

  async function remove() {
    if (!confirm("Delete this player permanently? This cannot be undone.")) return;
    setBusy(true);
    await fetch(`/api/admin/players/${playerId}`, { method: "DELETE" });
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="inline-flex gap-2">
      <Link
        href={`/admin/players/${playerId}`}
        className="rounded-md bg-indigo-500 px-3 py-1.5 text-xs font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400"
      >
        Edit riddles
      </Link>
      <button
        type="button"
        onClick={reset}
        disabled={busy}
        className="rounded-md border border-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-200 transition hover:border-slate-500 disabled:opacity-50"
      >
        Reset
      </button>
      <button
        type="button"
        onClick={remove}
        disabled={busy}
        className="rounded-md border border-rose-800 px-3 py-1.5 text-xs font-semibold text-rose-300 transition hover:bg-rose-950/40 disabled:opacity-50"
      >
        Delete
      </button>
    </div>
  );
}
