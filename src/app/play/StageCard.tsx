"use client";

import { useEffect, useRef, useState } from "react";
import PasscodeInput from "./PasscodeInput";

export type StageDTO = {
  id: string;
  order_index: number;
  label: string;
  max_attempts: number;
  cooldown_seconds: number;
  passcode_set: boolean;
  attempts_used: number;
  attempts_remaining: number;
  solved: boolean;
  seconds_remaining: number;
};

export default function StageCard({ initial }: { initial: StageDTO }) {
  const [stage, setStage] = useState<StageDTO>(initial);
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(initial.seconds_remaining);
  const submittedRef = useRef("");

  // Live cooldown countdown
  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          // After cooldown ends, refresh local state to "fresh batch".
          setStage((prev) => ({
            ...prev,
            attempts_used: 0,
            attempts_remaining: prev.max_attempts,
            seconds_remaining: 0,
          }));
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  async function submit(guess: string) {
    if (busy || stage.solved || secondsLeft > 0 || !stage.passcode_set) return;
    if (guess.length !== 4) return;
    if (submittedRef.current === guess) return;
    submittedRef.current = guess;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/stages/${stage.id}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });
      const data = await res.json();
      if (data.status === "correct") {
        setStage((p) => ({ ...p, solved: true, attempts_remaining: p.max_attempts }));
        setValue("");
        setMessage("Correct!");
      } else if (data.status === "already_solved") {
        setStage((p) => ({ ...p, solved: true }));
      } else if (data.status === "wrong") {
        setStage((p) => ({
          ...p,
          attempts_remaining: data.attempts_remaining,
          attempts_used: p.max_attempts - data.attempts_remaining,
        }));
        setShake(true);
        setMessage("Wrong code");
        setValue("");
        setTimeout(() => setShake(false), 450);
      } else if (data.status === "locked") {
        setStage((p) => ({ ...p, attempts_used: 0, attempts_remaining: p.max_attempts }));
        setSecondsLeft(data.seconds_remaining ?? stage.cooldown_seconds);
        setShake(true);
        setMessage("Locked");
        setValue("");
        setTimeout(() => setShake(false), 450);
      } else if (data.status === "cooldown") {
        setSecondsLeft(data.seconds_remaining ?? stage.cooldown_seconds);
      } else if (data.status === "not_ready") {
        setMessage("Not ready yet — ask the organiser.");
      } else if (data.error) {
        setMessage(data.error);
      }
    } catch {
      setMessage("Network error — try again.");
    } finally {
      setBusy(false);
      // Allow retry after a short delay even if user retypes the same digits
      setTimeout(() => {
        submittedRef.current = "";
      }, 400);
    }
  }

  const onCooldown = secondsLeft > 0;
  const disabled = stage.solved || onCooldown || busy || !stage.passcode_set;

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const cooldownText = `${minutes}:${seconds.toString().padStart(2, "0")}`;

  return (
    <div
      className={`rounded-2xl border p-6 transition ${
        stage.solved
          ? "border-emerald-700/60 bg-emerald-950/40"
          : onCooldown
            ? "border-amber-700/40 bg-amber-950/20"
            : "border-slate-800 bg-slate-900/60"
      }`}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-xl font-semibold">
          {stage.label || `Riddle ${stage.order_index}`}
        </h2>
        {stage.solved ? (
          <span className="rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300">
            ✓ Solved
          </span>
        ) : !stage.passcode_set ? (
          <span className="rounded-full bg-slate-700/40 px-3 py-1 text-xs font-semibold text-slate-300">
            Not set
          </span>
        ) : null}
      </div>

      {stage.solved ? (
        <p className="text-sm text-emerald-300">You cracked this code.</p>
      ) : (
        <>
          <PasscodeInput
            value={value}
            onChange={setValue}
            onComplete={submit}
            disabled={disabled}
            shake={shake}
          />
          <div className="mt-3 flex items-center justify-between text-sm">
            {onCooldown ? (
              <span className="font-medium text-amber-300">
                Locked — try again in {cooldownText}
              </span>
            ) : !stage.passcode_set ? (
              <span className="text-slate-400">
                Organiser hasn&apos;t set this passcode yet.
              </span>
            ) : (
              <span className="text-slate-300">
                {stage.attempts_remaining} attempt
                {stage.attempts_remaining === 1 ? "" : "s"} remaining
              </span>
            )}
            <button
              type="button"
              disabled={disabled || value.length !== 4}
              onClick={() => submit(value)}
              className="rounded-md bg-indigo-500 px-3 py-1.5 text-sm font-semibold text-white shadow shadow-indigo-500/20 transition hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Submit
            </button>
          </div>
          {message && !onCooldown && (
            <p
              className={`mt-2 text-sm ${
                message === "Correct!" ? "text-emerald-300" : "text-rose-300"
              }`}
            >
              {message}
            </p>
          )}
        </>
      )}
    </div>
  );
}
