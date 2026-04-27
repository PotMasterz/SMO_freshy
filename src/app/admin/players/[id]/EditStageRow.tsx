"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import PasscodeInput from "@/app/play/PasscodeInput";

type Stage = {
  id: string;
  order_index: number;
  label: string;
  max_attempts: number;
  cooldown_seconds: number;
  passcode_set: boolean;
};

export default function EditStageRow({ stage }: { stage: Stage }) {
  const router = useRouter();
  const [label, setLabel] = useState(stage.label || `ข้อที่ ${stage.order_index}`);
  const [passcode, setPasscode] = useState("");
  const [editingCode, setEditingCode] = useState(!stage.passcode_set);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [passcodeSet, setPasscodeSet] = useState(stage.passcode_set);

  async function save() {
    setBusy(true);
    setMessage(null);
    const body: Record<string, unknown> = { label };
    if (editingCode && passcode.length === 4) {
      body.passcode = passcode;
    } else if (editingCode && passcode.length > 0) {
      setMessage("Passcode must be exactly 4 digits.");
      setBusy(false);
      return;
    }
    const res = await fetch(`/api/admin/stages/${stage.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = await res.json();
    if (!res.ok) {
      setMessage(data.error || "Failed to save");
      setBusy(false);
      return;
    }
    if (data.passcode_changed) {
      setPasscodeSet(true);
      setEditingCode(false);
      setPasscode("");
      setMessage("Saved. Player progress for this riddle has been reset.");
    } else {
      setMessage("Saved.");
    }
    setBusy(false);
    router.refresh();
  }

  return (
    <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-5">
      <div className="mb-3 flex items-center justify-between">
        <span className="text-xs uppercase tracking-wider text-indigo-300">
          Slot {stage.order_index}
        </span>
        {passcodeSet ? (
          <span className="rounded-full bg-emerald-500/10 px-2 py-0.5 text-xs font-semibold text-emerald-300">
            Passcode set
          </span>
        ) : (
          <span className="rounded-full bg-slate-700/40 px-2 py-0.5 text-xs font-semibold text-slate-300">
            Not set
          </span>
        )}
      </div>

      <label className="mb-1 block text-xs font-medium text-slate-400">Label</label>
      <input
        value={label}
        onChange={(e) => setLabel(e.target.value)}
        className="mb-4 w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
      />

      <label className="mb-2 block text-xs font-medium text-slate-400">4-digit passcode</label>
      {editingCode ? (
        <PasscodeInput value={passcode} onChange={setPasscode} />
      ) : (
        <button
          type="button"
          onClick={() => setEditingCode(true)}
          className="rounded-md border border-slate-700 px-3 py-1.5 text-xs text-slate-300 hover:border-slate-500"
        >
          Change passcode
        </button>
      )}

      {message && (
        <p className="mt-3 text-xs text-slate-300">{message}</p>
      )}

      <div className="mt-4 flex justify-end">
        <button
          type="button"
          onClick={save}
          disabled={busy}
          className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:opacity-60"
        >
          {busy ? "Saving…" : "Save"}
        </button>
      </div>
    </div>
  );
}
