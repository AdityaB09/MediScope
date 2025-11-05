/* web/src/components/CohortExplorer.tsx */
import React, { useState } from "react";
import { cohortExplore } from "../api";

const toNum = (s: string) => (s.trim() === "" ? null : Number(s.trim()));
const parseList = (s: string) =>
  s.trim() ? s.split(",").map(t => Number(t.trim())).filter(Number.isFinite) : [];

export default function CohortExplorer() {
  const [sex, setSex] = useState<"any" | "0" | "1">("any");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [cp, setCp] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  const [summary, setSummary] = useState<any>(null);

  async function run() {
    setBusy(true); setErr(""); setSummary(null);
    try {
      const payload = {
        sex: sex === "any" ? null : Number(sex),
        age_min: toNum(ageMin),
        age_max: toNum(ageMax),
        cp_in: parseList(cp),
      };
      const j = await cohortExplore(payload);
      setSummary(j);
    } catch (e: any) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Cohort Explorer</h2>
      <div className="grid-2" style={{ gap: 8 }}>
        <select className="input" value={sex} onChange={e => setSex(e.target.value as any)}>
          <option value="any">sex (any)</option>
          <option value="0">sex=0</option>
          <option value="1">sex=1</option>
        </select>
        <input className="input" placeholder="Age min" value={ageMin} onChange={e=>setAgeMin(e.target.value)} />
        <input className="input" placeholder="Age max" value={ageMax} onChange={e=>setAgeMax(e.target.value)} />
        <input className="input" placeholder="cp list (comma sep)" value={cp} onChange={e=>setCp(e.target.value)} />
      </div>
      <div style={{ marginTop: 8 }}>
        <button className="btn" onClick={run} disabled={busy}>{busy ? "Running…" : "Run"}</button>
        {err && <div className="muted" style={{ marginTop: 6, color: "#fca5a5" }}>{err}</div>}
      </div>
      {summary && (
        <div className="panel" style={{ marginTop: 10 }}>
          <div className="panel-title">Summary</div>
          <pre style={{ margin: 0, whiteSpace: "pre-wrap" }}>{JSON.stringify(summary, null, 2)}</pre>
        </div>
      )}
    </div>
  );
}
