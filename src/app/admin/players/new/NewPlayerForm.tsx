"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function NewPlayerForm({
  freeSlots,
  initialSlot,
}: {
  freeSlots: number[];
  initialSlot?: number;
}) {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [slot, setSlot] = useState<number>(initialSlot ?? freeSlots[0] ?? 1);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (freeSlots.length === 0) {
    return (
      <p className="text-sm text-slate-300">
        All 7 slots are full. Delete a player from the dashboard first.
      </p>
    );
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/admin/players", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username,
        password,
        display_name: displayName,
        slot_number: slot,
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const messages: Record<string, string> = {
        username_invalid: "Username must be 3–20 characters, letters/numbers/underscore/hyphen only.",
        username_taken: "That username is already taken.",
        password_too_short: "Password must be at least 6 characters.",
        slot_taken: "That slot is already taken.",
      };
      setError(messages[data.error] || data.error || "Failed to create player");
      setBusy(false);
      return;
    }
    router.replace(`/admin/players/${data.id}`);
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Username</label>
        <input
          type="text"
          required
          autoCapitalize="none"
          autoCorrect="off"
          spellCheck={false}
          pattern="[a-zA-Z0-9_\-]{3,20}"
          title="3–20 characters: letters, numbers, _ or -"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none focus:border-indigo-500"
        />
        <p className="text-xs text-slate-500">
          Letters, numbers, _ or – only (3–20 chars). This is what the player types to log in.
        </p>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Display name (optional)</label>
        <input
          type="text"
          value={displayName}
          onChange={(e) => setDisplayName(e.target.value)}
          placeholder="Same as username if left blank"
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Password (min 6 chars)</label>
        <input
          type="text"
          required
          minLength={6}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 font-mono text-slate-100 outline-none focus:border-indigo-500"
        />
        <p className="text-xs text-slate-500">
          Write this down — you&apos;ll hand it to the player on a slip.
        </p>
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Slot number</label>
        <select
          value={slot}
          onChange={(e) => setSlot(Number(e.target.value))}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
        >
          {freeSlots.map((s) => (
            <option key={s} value={s}>
              Slot {s}
            </option>
          ))}
        </select>
      </div>
      {error && (
        <p className="rounded-md border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-60"
      >
        {busy ? "Creating…" : "Create player"}
      </button>
    </form>
  );
}
