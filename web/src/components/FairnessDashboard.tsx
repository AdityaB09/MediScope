import React, { useEffect, useState } from "react";
import { metricsFairness as fairness } from "../api";

type GroupRow = { group: string; count: number; positive_rate: number };

function normalizeFairness(json: any): GroupRow[] {
  // expected json: { groups: { sex: { count: {0:96,1:207}, positive_rate: {0:0.75,1:0.449..} } }, ... }
  if (!json || !json.groups || typeof json.groups !== "object") return [];
  const firstDim = Object.keys(json.groups)[0]; // e.g., "sex"
  if (!firstDim) return [];

  const g = json.groups[firstDim] || {};
  const counts = g.count || {};
  const rates = g.positive_rate || {};

  // counts/rates are objects keyed by level ("0","1", etc.). Build an array.
  const rows: GroupRow[] = Object.keys(counts).map((k) => ({
    group: `${firstDim}=${k}`,
    count: Number(counts[k] ?? 0),
    positive_rate: Number(rates[k] ?? 0),
  }));

  // ensure it's an array
  return Array.isArray(rows) ? rows : [];
}

export default function FairnessDashboard() {
  const [rows, setRows] = useState<GroupRow[] | null>(null);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const json = await fairness();
        if (!alive) return;
        setRows(normalizeFairness(json));
      } catch (e: any) {
        if (!alive) return;
        setErr(e?.message || "failed to load fairness");
        setRows([]);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  if (err) {
    return (
      <div className="p-3 rounded-xl bg-[#111827]">
        <div className="font-semibold mb-1">Fairness Dashboard</div>
        <div className="text-sm opacity-70">Error: {err}</div>
      </div>
    );
  }

  if (rows === null) {
    return (
      <div className="p-3 rounded-xl bg-[#111827]">
        <div className="font-semibold mb-1">Fairness Dashboard</div>
        <div className="text-sm opacity-70">Loading…</div>
      </div>
    );
  }

  return (
    <div className="p-3 rounded-xl bg-[#111827]">
      <div className="font-semibold mb-3">Fairness Dashboard</div>
      {rows.length === 0 ? (
        <div className="text-sm opacity-70">No groups found.</div>
      ) : (
        <table className="w-full text-sm">
          <thead className="opacity-70">
            <tr>
              <th className="text-left py-1">Group</th>
              <th className="text-right py-1">Count</th>
              <th className="text-right py-1">Positive rate</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i} className="border-t border-[#1f2937]">
                <td className="py-1">{r.group}</td>
                <td className="py-1 text-right">{r.count}</td>
                <td className="py-1 text-right">
                  {(r.positive_rate * 100).toFixed(1)}%
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
