import React from "react";

type Row = {
  when?: string;      // ISO timestamp from API
  model?: string;     // "heart-v1"
  prob?: number;      // main probability
  score?: number;     // alias of prob for ranking
};

function fmtDate(iso?: string) {
  if (!iso) return "—";
  const d = new Date(iso);
  return isNaN(d.getTime()) ? "—" : d.toLocaleString();
}
const pct = (v?: number) => (typeof v === "number" ? `${(v * 100).toFixed(1)}%` : "—");

export default function SessionsTable({ rows }: { rows: Row[] }) {
  const safe = Array.isArray(rows) ? rows : [];
  return (
    <div className="table-wrap">
      <table className="table">
        <thead>
          <tr>
            <th>When</th>
            <th>Model</th>
            <th>Risk</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {safe.length === 0 ? (
            <tr><td colSpan={4} className="muted">No sessions yet.</td></tr>
          ) : (
            safe.map((r, i) => (
              <tr key={`${r.when}-${i}`}>
                <td>{fmtDate(r.when)}</td>
                <td>{r.model ?? "—"}</td>
                <td>{pct(r.prob)}</td>
                <td>{pct(r.score ?? r.prob)}</td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
