"use client";

import { MinusIcon, PlusIcon } from "./Icons";

export function QtyStepper({ value, max, onChange, small }: { value: number; max: number; onChange: (n: number) => void; small?: boolean }) {
  const h = small ? "h-9" : "h-12";
  return (
    <div className={`inline-flex ${h} items-center border border-border bg-surface`}>
      <button type="button" aria-label="Decrease quantity" className={`grid ${h} w-9 place-items-center text-secondary hover:text-ivory disabled:opacity-30`} disabled={value <= 1} onClick={() => onChange(value - 1)}>
        <MinusIcon width={14} height={14} />
      </button>
      <span className="w-8 text-center text-sm tabular-nums" aria-live="polite">{value}</span>
      <button type="button" aria-label="Increase quantity" className={`grid ${h} w-9 place-items-center text-secondary hover:text-ivory disabled:opacity-30`} disabled={value >= Math.min(max, 10)} onClick={() => onChange(value + 1)}>
        <PlusIcon width={14} height={14} />
      </button>
    </div>
  );
}
