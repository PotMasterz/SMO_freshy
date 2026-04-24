"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function AddStageButton({ playerId }: { playerId: string }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function add() {
    setBusy(true);
    const res = await fetch(`/api/admin/players/${playerId}/stages`, {
      method: "POST",
    });
    if (!res.ok) {
      const data = await res.json();
      alert(data.error || "Failed to add riddle");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <button
      type="button"
      onClick={add}
      disabled={busy}
      className="w-full rounded-xl border-2 border-dashed border-slate-700 py-4 text-sm font-semibold text-slate-400 transition hover:border-indigo-500 hover:text-indigo-300 disabled:opacity-50"
    >
      {busy ? "Adding…" : "+ Add riddle"}
    </button>
  );
}
