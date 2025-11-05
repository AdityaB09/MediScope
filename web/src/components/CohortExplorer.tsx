// web/src/components/CohortExplorer.tsx
import React, { useState } from "react";
import { cohortsExplore } from "../api";

export default function CohortExplorer() {
  const [sex, setSex] = useState<"" | "0" | "1">(""); // "" means any
  const [ageMin, setAgeMin] = useState<string>("");
  const [ageMax, setAgeMax] = useState<string>("");
  const [cpCsv, setCpCsv] = useState<string>("");
  const [out, setOut] = useState<any>(null);
  const [err, setErr] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const parseIntOrUndef = (s: string) => {
    const t = s.trim();
    if (!t) return undefined;
    const n = Number(t);
    return Number.isFinite(n) ? (n as number) : undefined;
  };

  const parseCsvToNumArray = (s: string) => {
    const t = s.trim();
    if (!t) return undefined;
    const arr = t
      .split(",")
      .map(x => x.trim())
      .filter(Boolean)
      .map(x => Number(x))
      .filter(Number.isFinite) as number[];
    return arr.length ? arr : undefined;
  };

  const run = async () => {
    setErr("");
    setOut(null);
    setLoading(true);
    try {
      const payload = {
        sex: sex === "" ? undefined : (Number(sex) as 0 | 1),
        ageMin: parseIntOrUndef(ageMin),
        ageMax: parseIntOrUndef(ageMax),
        cpList: parseCsvToNumArray(cpCsv),
      };
      const j = await cohortsExplore(payload);
      setOut(j);
    } catch (e: any) {
      setErr(e?.message ?? String(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>Cohort Explorer</h2>

      <div className="grid-2" style={{ gap: 8 }}>
        <select
          value={sex}
          onChange={(e) => setSex(e.target.value as any)}
          className="input"
        >
          <option value="">sex (any)</option>
          <option value="0">sex = 0</option>
          <option value="1">sex = 1</option>
        </select>

        <input
          className="input"
          placeholder="Age min"
          value={ageMin}
          onChange={(e) => setAgeMin(e.target.value)}
        />

        <input
          className="input"
          placeholder="Age max"
          value={ageMax}
          onChange={(e) => setAgeMax(e.target.value)}
        />

        <input
          className="input"
          placeholder="cp list (comma sep)"
          value={cpCsv}
          onChange={(e) => setCpCsv(e.target.value)}
        />
      </div>

      <button className="btn" style={{ marginTop: 10 }} onClick={run} disabled={loading}>
        {loading ? "Running…" : "Run"}
      </button>

      {err && (
        <div style={{ color: "#fda4af", marginTop: 8, fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace" }}>
          {err}
        </div>
      )}

      {out && (
        <div className="muted" style={{ marginTop: 8 }}>
          {out.summary
            ? `count ${out.summary.count}, positive_rate ${out.summary.positive_rate}`
            : "explore complete"}
        </div>
      )}
    </div>
  );
}
