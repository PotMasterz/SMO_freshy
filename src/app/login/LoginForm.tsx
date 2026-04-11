"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createSupabaseBrowserClient } from "@/lib/supabase/client";

export default function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const supabase = createSupabaseBrowserClient();
    const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
    if (signInError) {
      setError(signInError.message);
      setBusy(false);
      return;
    }

    // Decide where to land. Ask the server which page is appropriate (admin vs play).
    const meRes = await fetch("/api/me", { cache: "no-store" });
    if (meRes.ok) {
      const me = await meRes.json();
      router.replace(me.profile?.is_admin ? "/admin" : (next || "/play"));
      router.refresh();
      return;
    }
    router.replace(next || "/play");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Email</label>
        <input
          type="email"
          required
          autoComplete="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
        />
      </div>
      <div className="space-y-1">
        <label className="block text-sm font-medium text-slate-300">Password</label>
        <input
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full rounded-lg border border-slate-700 bg-slate-950 px-3 py-2 text-slate-100 outline-none focus:border-indigo-500"
        />
      </div>
      {error && (
        <p className="rounded-md border border-rose-900/50 bg-rose-950/40 px-3 py-2 text-sm text-rose-300">
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={busy}
        className="w-full rounded-lg bg-indigo-500 px-4 py-2.5 font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {busy ? "Signing in…" : "Sign in"}
      </button>
    </form>
  );
}
