"use client";

type Props = {
  onDigit: (d: string) => void;
  onBackspace: () => void;
  onSubmit: () => void;
  submitDisabled?: boolean;
};

export default function Numpad({ onDigit, onBackspace, onSubmit, submitDisabled }: Props) {
  const btnClass =
    "flex h-14 items-center justify-center rounded-xl border border-slate-700 bg-slate-800 text-2xl font-bold text-slate-100 transition active:scale-95 active:bg-slate-700 select-none";

  return (
    <div className="mx-auto grid w-full max-w-xs grid-cols-3 gap-2">
      {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((d) => (
        <button key={d} type="button" className={btnClass} onClick={() => onDigit(d)}>
          {d}
        </button>
      ))}
      <button type="button" className={btnClass} onClick={onBackspace}>
        ⌫
      </button>
      <button type="button" className={btnClass} onClick={() => onDigit("0")}>
        0
      </button>
      <button
        type="button"
        disabled={submitDisabled}
        onClick={onSubmit}
        className="flex h-14 items-center justify-center rounded-xl bg-indigo-500 text-base font-bold text-white shadow shadow-indigo-500/20 transition active:scale-95 active:bg-indigo-400 disabled:opacity-50 select-none"
      >
        ส่ง
      </button>
    </div>
  );
}
