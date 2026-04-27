"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { StageDTO } from "./types";

export default function StageBox({ initial }: { initial: StageDTO }) {
  const [secondsLeft, setSecondsLeft] = useState(initial.seconds_remaining);

  useEffect(() => {
    if (secondsLeft <= 0) return;
    const id = setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          clearInterval(id);
          return 0;
        }
        return s - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [secondsLeft]);

  const solved = initial.solved;
  const locked = secondsLeft > 0;
  const label = `ข้อที่ ${initial.order_index}`;
  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const timerText = `${minutes.toString().padStart(2, "0")}:${seconds.toString().padStart(2, "0")}`;

  if (solved) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-emerald-600 bg-emerald-600/30 p-4 shadow-lg shadow-emerald-500/10">
        <p className="text-xl font-bold text-emerald-100">{label}</p>
        <p className="mt-1 text-sm font-semibold text-emerald-300">แก้แล้ว</p>
      </div>
    );
  }

  if (locked) {
    return (
      <div className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800/60 p-4 opacity-70">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          viewBox="0 0 24 24"
          fill="currentColor"
          className="mb-2 h-8 w-8 text-amber-400"
        >
          <path
            fillRule="evenodd"
            d="M12 1.5a5.25 5.25 0 0 0-5.25 5.25v3a3 3 0 0 0-3 3v6.75a3 3 0 0 0 3 3h10.5a3 3 0 0 0 3-3v-6.75a3 3 0 0 0-3-3v-3c0-2.9-2.35-5.25-5.25-5.25Zm3.75 8.25v-3a3.75 3.75 0 1 0-7.5 0v3h7.5Z"
            clipRule="evenodd"
          />
        </svg>
        <p className="text-lg font-bold text-slate-300">{label}</p>
        <p className="mt-1 font-mono text-xl font-bold text-amber-300">{timerText}</p>
      </div>
    );
  }

  return (
    <Link
      href={`/play/${initial.id}`}
      className="flex aspect-square flex-col items-center justify-center rounded-2xl border-2 border-slate-700 bg-slate-800/60 p-4 shadow-lg transition hover:border-indigo-500 hover:bg-slate-800 active:scale-95"
    >
      <p className="text-xl font-bold">{label}</p>
    </Link>
  );
}
