// web/src/components/ThresholdTuner.tsx
import React from "react";

type Props = {
  low: number;
  high: number;
  onChange: (vals: { low: number; high: number }) => void;
};

export default function ThresholdTuner({ low, high, onChange }: Props) {
  return (
    <div className="p-4 rounded-xl bg-slate-800/60 border border-slate-700 space-y-3">
      <div className="text-sm font-semibold">Threshold Tuner</div>
      <div className="grid grid-cols-2 gap-3">
        <label className="flex items-center gap-2">
          <span className="w-20 text-sm text-slate-300">Low</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={low}
            onChange={(e) => onChange({ low: Number(e.target.value), high })}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-slate-100"
          />
        </label>
        <label className="flex items-center gap-2">
          <span className="w-20 text-sm text-slate-300">High</span>
          <input
            type="number"
            step="0.01"
            min={0}
            max={1}
            value={high}
            onChange={(e) => onChange({ low, high: Number(e.target.value) })}
            className="w-full rounded-md bg-slate-900 border border-slate-700 px-2 py-1 text-slate-100"
          />
        </label>
      </div>
      <p className="text-xs text-slate-400">
        Risks: prob &lt; low → Low, low ≤ prob &lt; high → Medium, ≥ high → High
      </p>
    </div>
  );
}
