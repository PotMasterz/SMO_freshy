"use client";

import { useEffect, useRef } from "react";

type Props = {
  value: string;
  onChange: (v: string) => void;
  onComplete?: (v: string) => void;
  disabled?: boolean;
  shake?: boolean;
};

export default function PasscodeInput({
  value,
  onChange,
  onComplete,
  disabled,
  shake,
}: Props) {
  const refs = [
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
    useRef<HTMLInputElement>(null),
  ];

  // Sync external value (e.g. clear after wrong attempt) into the inputs.
  useEffect(() => {
    refs.forEach((r, i) => {
      if (r.current) r.current.value = value[i] ?? "";
    });
  }, [value]);

  function setDigit(index: number, raw: string) {
    const cleaned = raw.replace(/\D/g, "").slice(0, 1);
    const arr = value.split("");
    while (arr.length < 4) arr.push("");
    arr[index] = cleaned;
    const next = arr.slice(0, 4).join("");
    onChange(next);
    if (cleaned && index < 3) {
      refs[index + 1].current?.focus();
    }
    if (next.length === 4 && /^\d{4}$/.test(next)) {
      onComplete?.(next);
    }
  }

  function onKeyDown(index: number, e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Backspace") {
      const arr = value.split("");
      while (arr.length < 4) arr.push("");
      if (arr[index]) {
        arr[index] = "";
        onChange(arr.join(""));
      } else if (index > 0) {
        arr[index - 1] = "";
        onChange(arr.join(""));
        refs[index - 1].current?.focus();
      }
      e.preventDefault();
    } else if (e.key === "ArrowLeft" && index > 0) {
      refs[index - 1].current?.focus();
    } else if (e.key === "ArrowRight" && index < 3) {
      refs[index + 1].current?.focus();
    }
  }

  function onPaste(e: React.ClipboardEvent<HTMLInputElement>) {
    const text = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, 4);
    if (!text) return;
    e.preventDefault();
    onChange(text.padEnd(4, "").slice(0, 4));
    refs[Math.min(text.length, 3)].current?.focus();
    if (text.length === 4) onComplete?.(text);
  }

  return (
    <div
      className={`flex gap-2 sm:gap-3 ${shake ? "animate-shake" : ""}`}
      aria-label="4-digit passcode"
    >
      {[0, 1, 2, 3].map((i) => (
        <input
          key={i}
          ref={refs[i]}
          type="text"
          inputMode="numeric"
          autoComplete="one-time-code"
          maxLength={1}
          disabled={disabled}
          defaultValue={value[i] ?? ""}
          onChange={(e) => setDigit(i, e.target.value)}
          onKeyDown={(e) => onKeyDown(i, e)}
          onPaste={onPaste}
          className="h-14 w-12 rounded-lg border border-slate-700 bg-slate-950 text-center text-2xl font-bold tracking-widest text-slate-100 outline-none focus:border-indigo-500 disabled:opacity-50 sm:h-16 sm:w-14 sm:text-3xl"
        />
      ))}
    </div>
  );
}
