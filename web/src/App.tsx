/* web/src/App.tsx */
import React, { useEffect, useState } from "react";
import PatientForm from "./components/PatientForm";
import RiskGauge from "./components/RiskGauge";
import ShapBar from "./components/ShapBar";
import WhatIfPanel from "./components/WhatIfPanel";
import BatchPanel from "./components/BatchPanel";
import ThresholdTuner from "./components/ThresholdTuner";
import GlobalShapCard from "./components/GlobalShapCard";
import FairnessDashboard from "./components/FairnessDashboard";
import CohortExplorer from "./components/CohortExplorer";
import { predict, whatif, downloadPdf, latestSessions } from "./api";

export default function App() {
  const [result, setResult] = useState<any>(null);
  const [lastFeatures, setLastFeatures] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [whatifResult, setWhatIf] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  async function doPredict(features: any) {
    setLastFeatures(features);
    setBusy(true);
    try {
      const r = await predict(features);
      setResult(r);
      setWhatIf(null);
      const s = await latestSessions().catch(() => []);
      setSessions(s);
    } finally {
      setBusy(false);
    }
  }

  async function runWhatIf(deltas: any) {
    if (!lastFeatures) return;
    const raw = await whatif(lastFeatures, deltas);

    const delta_prob = raw.delta_prob ?? raw.dprob ?? null;

    const toContribs = (x: any) => {
      if (!x) return {};
      if (x.contribs) return x.contribs;
      if (Array.isArray(x.shap)) {
        const o: Record<string, number> = {};
        for (const [k, v] of x.shap) o[String(k)] = Number(v);
        return o;
      }
      return {};
    };

    setWhatIf({
      delta_prob,
      base:    { prob: raw.base?.prob,    label: raw.base?.label,    contribs: toContribs(raw.base)    },
      tweaked: { prob: raw.tweaked?.prob, label: raw.tweaked?.label, contribs: toContribs(raw.tweaked) },
    });
  }

  async function makePdf(features: any) {
    const url = await downloadPdf(features);
    const a = document.createElement("a");
    a.href = url; a.download = "mediscope_report.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  }

  useEffect(() => { latestSessions().then(setSessions).catch(()=>{}); }, []);
  const pct = (v: number | undefined) => v !== undefined && v !== null ? (v * 100).toFixed(1) : "--";

  return (
    <div className="container">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
        <div style={{ fontWeight: 800, fontSize: 24 }}>MediScope — Predictive Healthcare</div>
        <div style={{ display: "flex", gap: 10 }}>
          <a className="btn" href="http://localhost:8080/swagger" target="_blank" rel="noreferrer">API Docs</a>
        </div>
      </div>

      <div className="grid-2">
        <PatientForm onSubmit={doPredict} onPdf={makePdf} busy={busy}/>
        <div>
          {result ? (
            <>
              <RiskGauge prob={result.prob} label={result.label} />
              <div className="card">
                <h2>Top Feature Contributions (SHAP)</h2>
                <ShapBar contribs={result.contribs || result.contrib || {}} />
              </div>
            </>
          ) : (
            <div className="card">
              <h2>No prediction yet</h2>
              <div className="muted">Enter features and click <b>Predict</b>.</div>
            </div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <FairnessDashboard/>
        <CohortExplorer/>
      </div>

      <div className="grid-2">
        <WhatIfPanel base={lastFeatures} basePredReady={!!result} onRun={runWhatIf} />
        <div className="card">
          <h2>What-If Result</h2>
          {whatifResult ? (
            <div>
              <div className="chip">Δprob: {pct(whatifResult.delta_prob)}%</div>
              <div className="grid-2" style={{ marginTop: 8 }}>
                <div>
                  <h3>Base</h3>
                  <div className="muted">prob {pct(whatifResult.base?.prob)}% — {whatifResult.base?.label || "—"}</div>
                  <ShapBar contribs={whatifResult.base?.contribs || {}}/>
                </div>
                <div>
                  <h3>Tweaked</h3>
                  <div className="muted">prob {pct(whatifResult.tweaked?.prob)}% — {whatifResult.tweaked?.label || "—"}</div>
                  <ShapBar contribs={whatifResult.tweaked?.contribs || {}}/>
                </div>
              </div>
            </div>
          ) : <div className="muted">Set deltas and click <b>Simulate</b>.</div>}
        </div>
      </div>

      <div className="grid-2">
        <BatchPanel/>
        <ThresholdTuner/>
      </div>

      <GlobalShapCard/>

      <div className="card">
        <h2>Recent Sessions</h2>
        <table>
          <thead><tr><th>When</th><th>Model</th><th>Risk</th><th>Score</th></tr></thead>
          <tbody>
            {sessions.map((s: any) => (
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.modelVersion}</td>
                <td>{s.riskLabel > 0.5 ? "High" : "Low"}</td>
                <td>{(s.riskScore * 100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted">Dataset: UCI Heart Disease (Cleveland); Model: Logistic Regression (scaled).</div>
    </div>
  );
}
