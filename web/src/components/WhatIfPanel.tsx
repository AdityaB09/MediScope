// web/src/components/WhatIfPanel.tsx
import React, { useMemo, useState } from "react";

type Props = {
  base?: Record<string, number> | null;
  basePredReady?: boolean;
  onRun: (deltas: Record<string, number>) => Promise<void> | void;
};

const FIELDS = [
  "age","sex","cp","trestbps","chol","fbs","restecg",
  "thalach","exang","oldpeak","slope","ca","thal",
];

export default function WhatIfPanel({ base, basePredReady, onRun }: Props) {
  const [form, setForm] = useState<Record<string, string>>(
    Object.fromEntries(FIELDS.map(k => [k, "0"]))
  );
  const [busy, setBusy] = useState(false);

  const disabled = !base || !basePredReady || busy;

  const set = (k: string, v: string) =>
    setForm(f => ({ ...f, [k]: v.replace(/[^\d.-]/g, "") }));

  const deltas = useMemo(() => {
    const d: Record<string, number> = {};
    for (const k of FIELDS) {
      const v = Number(form[k] ?? "0");
      if (!Number.isFinite(v)) continue;
      if (v !== 0) d[k] = v; // send only non-zero deltas
    }
    return d;
  }, [form]);

  async function submit() {
    if (disabled) return;
    setBusy(true);
    try {
      await onRun(deltas);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>What-If Explorer</h2>
      <div className="grid-4">
        {FIELDS.map(k => (
          <div key={k}>
            <div className="muted">{k} Δ</div>
            <input value={form[k]} onChange={e => set(k, e.target.value)} />
          </div>
        ))}
      </div>
      <div style={{marginTop:12}}>
        <button className="btn" onClick={submit} disabled={disabled}>
          {busy ? "Simulating…" : "Simulate"}
        </button>
        {!basePredReady && (
          <span className="muted" style={{marginLeft:8}}>
            Run a base prediction first.
          </span>
        )}
      </div>
    </div>
  );
} 
