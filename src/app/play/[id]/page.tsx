"use client";

import { useEffect, useState, useCallback } from "react";
import { useRouter, useParams } from "next/navigation";
import Numpad from "../Numpad";

type StageInfo = {
  id: string;
  order_index: number;
  label: string;
  max_attempts: number;
  cooldown_seconds: number;
  passcode_set: boolean;
  attempts_remaining: number;
  solved: boolean;
  seconds_remaining: number;
};

type Overlay = "none" | "correct" | "wrong-last";

export default function PasscodeEntryPage() {
  const router = useRouter();
  const params = useParams();
  const stageId = params.id as string;

  const [stage, setStage] = useState<StageInfo | null>(null);
  const [digits, setDigits] = useState<string[]>(["", "", "", ""]);
  const [busy, setBusy] = useState(false);
  const [shake, setShake] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [overlay, setOverlay] = useState<Overlay>("none");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      const res = await fetch("/api/me", { cache: "no-store" });
      if (!res.ok) {
        router.replace("/login");
        return;
      }
      const data = await res.json();
      const found = data.stages?.find((s: StageInfo) => s.id === stageId);
      if (!found) {
        router.replace("/play");
        return;
      }
      if (found.solved || found.seconds_remaining > 0) {
        router.replace("/play");
        return;
      }
      setStage(found);
      setLoading(false);
    }
    load();
  }, [stageId, router]);

  const goBack = useCallback(() => {
    router.replace("/play");
    router.refresh();
  }, [router]);

  function handleDigit(d: string) {
    if (overlay !== "none" || busy) return;
    setDigits((prev) => {
      const next = [...prev];
      const emptyIdx = next.findIndex((v) => v === "");
      if (emptyIdx !== -1) next[emptyIdx] = d;
      return next;
    });
  }

  function handleBackspace() {
    if (overlay !== "none" || busy) return;
    setDigits((prev) => {
      const next = [...prev];
      for (let i = 3; i >= 0; i--) {
        if (next[i] !== "") {
          next[i] = "";
          break;
        }
      }
      return next;
    });
  }

  async function handleSubmit() {
    if (!stage || overlay !== "none" || busy) return;
    const guess = digits.join("");
    if (guess.length !== 4) return;
    setBusy(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/stages/${stageId}/attempt`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ guess }),
      });
      const data = await res.json();

      if (data.status === "correct") {
        setOverlay("correct");
        setTimeout(goBack, 10000);
      } else if (data.status === "wrong") {
        setShake(true);
        setMessage("รหัสผิด");
        setDigits(["", "", "", ""]);
        setStage((prev) =>
          prev ? { ...prev, attempts_remaining: data.attempts_remaining } : prev,
        );
        setTimeout(() => setShake(false), 450);
      } else if (data.status === "locked") {
        setOverlay("wrong-last");
        setTimeout(goBack, 3000);
      } else if (data.status === "cooldown") {
        goBack();
      } else if (data.status === "already_solved") {
        goBack();
      } else if (data.status === "not_ready") {
        setMessage("ผู้จัดยังไม่ได้ตั้งรหัสข้อนี้");
      } else {
        setMessage(data.error || "เกิดข้อผิดพลาด");
      }
    } catch {
      setMessage("เครือข่ายมีปัญหา ลองใหม่");
    } finally {
      setBusy(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <p className="text-slate-400">กำลังโหลด…</p>
      </div>
    );
  }

  if (!stage) return null;

  const label = stage.label || `ข้อที่ ${stage.order_index}`;
  const isFull = digits.every((d) => d !== "");

  return (
    <div className="relative flex min-h-screen flex-col">
      {/* Green overlay — correct answer */}
      {overlay === "correct" && (
        <div className="animate-green-glow fixed inset-0 z-50 flex flex-col items-center justify-center bg-emerald-600/90">
          <p className="text-5xl font-extrabold text-white">ถูกต้อง!</p>
          <p className="mt-3 text-lg text-emerald-100">กำลังกลับ…</p>
        </div>
      )}

      {/* Red overlay — last wrong attempt */}
      {overlay === "wrong-last" && (
        <div className="animate-red-glow fixed inset-0 z-50 flex flex-col items-center justify-center bg-rose-600/90">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="mb-3 h-16 w-16 text-white"
          >
            <path
              fillRule="evenodd"
              d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
              clipRule="evenodd"
            />
          </svg>
          <p className="text-4xl font-extrabold text-white">ล็อคแล้ว</p>
        </div>
      )}

      {/* Header with back button */}
      <header className="flex items-center gap-3 px-4 pb-2 pt-6">
        <button
          type="button"
          onClick={goBack}
          className="rounded-lg px-2 py-1 text-sm font-semibold text-slate-400 transition hover:text-white"
        >
          ← กลับ
        </button>
      </header>

      {/* Main content */}
      <div className="flex flex-1 flex-col items-center justify-center px-6 pb-8">
        <p className="mb-2 text-sm font-bold uppercase tracking-[0.2em] text-indigo-400">
          SMO FRESHY
        </p>
        <h1 className="mb-8 text-3xl font-extrabold">{label}</h1>

        {/* OTP display */}
        <div className={`mb-3 flex gap-3 ${shake ? "animate-shake" : ""}`}>
          {digits.map((d, i) => (
            <div
              key={i}
              className="flex h-16 w-14 items-center justify-center rounded-xl border-2 border-slate-600 bg-slate-900 text-3xl font-extrabold text-white sm:h-20 sm:w-16 sm:text-4xl"
            >
              {d || <span className="text-slate-700">·</span>}
            </div>
          ))}
        </div>

        {/* Status message */}
        <p className="mb-6 h-6 text-sm">
          {message ? (
            <span className="font-semibold text-rose-300">{message}</span>
          ) : (
            <span className="text-slate-400">
              เหลือโอกาสอีก {stage.attempts_remaining} ครั้ง
            </span>
          )}
        </p>

        {/* Numpad */}
        <Numpad
          onDigit={handleDigit}
          onBackspace={handleBackspace}
          onSubmit={handleSubmit}
          submitDisabled={!isFull || busy}
        />
      </div>
    </div>
  );
}
