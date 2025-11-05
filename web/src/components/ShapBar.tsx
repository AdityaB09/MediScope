// web/src/components/ShapBar.tsx
import React, { useMemo } from "react";

type Props = {
  contribs: Record<string, number> | null | undefined;
  topK?: number;
};

export default function ShapBar({ contribs, topK = 10 }: Props) {
  const rows = useMemo(() => {
    const entries = Object.entries(contribs || {});
    if (!entries.length) return [];
    // sort by absolute contribution desc
    entries.sort((a, b) => Math.abs(b[1]) - Math.abs(a[1]));
    return entries.slice(0, topK);
  }, [contribs, topK]);

  if (!rows.length) {
    return (
      <div className="card">
        <h2>Top Feature Contributions (SHAP)</h2>
        <div className="muted">No SHAP contributions available.</div>
      </div>
    );
  }

  // simple CSS bar chart (works without any chart libs)
  const max = Math.max(...rows.map(([, v]) => Math.abs(v))) || 1;

  return (
    <div className="card">
      <h2>Top Feature Contributions (SHAP)</h2>
      <div style={{display:"grid", gap:8}}>
        {rows.map(([k, v]) => {
          const pct = Math.round((Math.abs(v) / max) * 100);
          const sign = v >= 0 ? "+" : "−";
          return (
            <div key={k} style={{display:"grid", gridTemplateColumns:"140px 1fr 62px", alignItems:"center", gap:8}}>
              <div className="muted" title={k}>{k}</div>
              <div style={{background:"#0f172a", borderRadius:8, overflow:"hidden"}}>
                <div
                  style={{
                    height:10,
                    width: `${pct}%`,
                    background: v >= 0 ? "#22d3ee" : "#f87171",
                    transition: "width .25s ease",
                  }}
                />
              </div>
              <div style={{textAlign:"right"}}>{sign}{Math.abs(v).toFixed(2)}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
