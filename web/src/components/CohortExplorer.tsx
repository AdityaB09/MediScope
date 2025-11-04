import React, { useState } from "react";
import { cohorts as cohortsExplore } from "../api";

type ExploreSummary = {
  status?: string;
  metrics?: Record<string, number | null>;
  high?: number;
  low?: number;
  features?: string[];
  version?: string;
};

export default function CohortExplorer() {
  const [sex, setSex] = useState<number | "">("");
  const [ageMin, setAgeMin] = useState<number | "">("");
  const [ageMax, setAgeMax] = useState<number | "">("");
  const [cp, setCp] = useState<string>(""); // comma-separated
  const [summary, setSummary] = useState<ExploreSummary | null>(null);
  const [examplesCount, setExamplesCount] = useState<number | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function run() {
    setLoading(true);
    setErr(null);
    try {
      const payload: any = {};
      if (sex !== "") payload.sex = Number(sex);
      if (ageMin !== "") payload.age_min = Number(ageMin);
      if (ageMax !== "") payload.age_max = Number(ageMax);
      if (cp.trim().length > 0) {
        payload.cp = cp
          .split(",")
          .map((x) => x.trim())
          .filter(Boolean)
          .map((x) => Number(x));
      }

      const j = await cohortsExplore(payload);
      // be defensive with shapes
      const s: ExploreSummary = (j?.py || j || {}) as ExploreSummary;
      setSummary(s);
      const exLen =
        typeof j?.examples?.length === "number" ? j.examples.length : 0;
      setExamplesCount(exLen);
    } catch (e: any) {
      setErr(e?.message || "cohort explore failed");
      setSummary(null);
      setExamplesCount(null);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="p-3 rounded-xl bg-[#111827]">
      <div className="font-semibold mb-2">Cohort Explorer</div>

      <div className="grid grid-cols-2 gap-2 mb-2">
        <select
          value={sex}
          onChange={(e) =>
            setSex(e.target.value === "" ? "" : Number(e.target.value))
          }
          className="bg-[#0b1220] rounded px-2 py-1"
        >
          <option value="">sex (any)</option>
          <option value="0">0</option>
          <option value="1">1</option>
        </select>

        <input
          className="bg-[#0b1220] rounded px-2 py-1"
          placeholder="Age min"
          value={ageMin}
          onChange={(e) =>
            setAgeMin(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
        <input
          className="bg-[#0b1220] rounded px-2 py-1"
          placeholder="Age max"
          value={ageMax}
          onChange={(e) =>
            setAgeMax(e.target.value === "" ? "" : Number(e.target.value))
          }
        />
        <input
          className="bg-[#0b1220] rounded px-2 py-1"
          placeholder="cp list (comma sep)"
          value={cp}
          onChange={(e) => setCp(e.target.value)}
        />
      </div>

      <button
        onClick={run}
        disabled={loading}
        className="btn"
        style={{ background: "var(--accent)", borderRadius: 10, padding: "6px 10px", fontWeight: 600 }}
      >
        {loading ? "Running…" : "Run"}
      </button>

      {err && <div className="mt-2 text-sm text-red-400">{err}</div>}

      {summary && (
        <div className="mt-3 text-sm">
          <div className="opacity-70">Status: {summary.status ?? "ok"}</div>
          {typeof summary.high === "number" && typeof summary.low === "number" && (
            <div className="opacity-70">Risk: low {summary.low}, high {summary.high}</div>
          )}
          {summary.metrics && (
            <div className="opacity-70">
              metrics:{" "}
              {Object.entries(summary.metrics)
                .map(([k, v]) => `${k}=${v ?? "n/a"}`)
                .join(", ")}
            </div>
          )}
          {examplesCount !== null && (
            <div className="opacity-70">examples: {examplesCount}</div>
          )}
        </div>
      )}
    </div>
  );
}
