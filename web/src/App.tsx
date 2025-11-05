import React, { useEffect, useMemo, useState } from "react";
import PatientForm from "./components/PatientForm";
import RiskGauge from "./components/RiskGauge";
import ShapBar from "./components/ShapBar";
import WhatIfPanel from "./components/WhatIfPanel";
import BatchPanel from "./components/BatchPanel";
import ThresholdTuner from "./components/ThresholdTuner";
import GlobalShapCard from "./components/GlobalShapCard";
import FairnessDashboard from "./components/FairnessDashboard";
import CohortExplorer from "./components/CohortExplorer";
import SessionsTable from "./components/SessionsTable";
import { predict, whatif, downloadPdf, latestSessions } from "./api";
import "./styles.css";

export default function App() {
  const [result, setResult] = useState<any>(null);
  const [lastFeatures, setLastFeatures] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [whatifResult, setWhatIf] = useState<any>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    latestSessions().then((s) => setSessions(Array.isArray(s) ? s : [])).catch(() => {});
  }, []);

  const pct = (v: number | undefined) => (v !== undefined ? `${(v * 100).toFixed(1)}%` : "—");

  async function doPredict(features: any) {
    setBusy(true);
    try {
      setLastFeatures(features);
      const r = await predict(features);
      setResult(r);
      setWhatIf(null);
      const s = await latestSessions().catch(() => []);
      setSessions(Array.isArray(s) ? s : []);
    } finally {
      setBusy(false);
    }
  }

  async function runWhatIf(deltas: any) {
    if (!lastFeatures) return;
    setBusy(true);
    try {
      const j = await whatif(lastFeatures, deltas);
      setWhatIf(j);
    } finally {
      setBusy(false);
    }
  }

  async function makePdf(features: any) {
    const url = await downloadPdf(features);
    const a = document.createElement("a");
    a.href = url;
    a.download = "mediscope_report.pdf";
    document.body.appendChild(a);
    a.click();
    a.remove();
    URL.revokeObjectURL(url);
  }

  function clearAll() {
    setResult(null);
    setLastFeatures(null);
    setWhatIf(null);
  }

  const headerStats = useMemo(() => {
    const risk = result?.prob ?? null;
    const label = result?.label ?? "";
    return [
      { k: "Current Risk", v: risk != null ? pct(risk) : "—", sub: label || "—" },
      { k: "Sessions", v: String(sessions?.length ?? 0), sub: "in this run" },
    ];
  }, [result, sessions]);

  return (
    <div className="shell">
      {/* Top bar */}
      <header className="topbar">
        <div className="brand">MediScope</div>
        <div className="top-actions">
          <a className="link" href="http://localhost:8080/swagger" target="_blank" rel="noreferrer">API Docs</a>
          <button className="btn ghost" onClick={clearAll} disabled={busy}>Clear</button>
          <button className="btn" onClick={() => lastFeatures && makePdf(lastFeatures)} disabled={!lastFeatures || busy}>
            Download PDF
          </button>
        </div>
      </header>

      {/* Hero stats */}
      <section className="hero">
        {headerStats.map((s) => (
          <div key={s.k} className="stat">
            <div className="stat-k">{s.k}</div>
            <div className="stat-v">{s.v}</div>
            <div className="stat-sub">{s.sub}</div>
          </div>
        ))}
      </section>

      {/* Row 1: Patient + Risk */}
      <section className="grid two">
        <div className="card">
          <div className="card-title">Patient Features</div>
          <PatientForm onSubmit={doPredict} onPdf={makePdf} />
        </div>

        <div className="card">
          <div className="card-title">Risk</div>
          {result ? (
            <>
              <div className="panel">
                <RiskGauge prob={result.prob} label={result.label} />
              </div>
              <div className="panel">
                <div className="panel-title">Top Feature Contributions (SHAP)</div>
                <ShapBar contribs={result.contribs || {}} />
              </div>
            </>
          ) : (
            <div className="empty">No prediction yet. Enter features and click <b>Predict</b>.</div>
          )}
        </div>
      </section>

      {/* Row 2: Fairness + Cohort */}
      <section className="grid two">
        <div className="card">
          <div className="card-title">Fairness Dashboard</div>
          <FairnessDashboard />
        </div>
        <div className="card">
          <div className="card-title">Cohort Explorer</div>
          <CohortExplorer />
        </div>
      </section>

      {/* Row 3: What-if + Result */}
      <section className="grid two">
        <div className="card">
          <div className="card-title">What-If Explorer</div>
          <WhatIfPanel base={lastFeatures} basePredReady={!!result} onRun={runWhatIf} />
          {!result && <div className="muted mt8">Run a base prediction first.</div>}
        </div>

        <div className="card">
          <div className="card-title">What-If Result</div>
          {whatifResult ? (
            <div className="grid two gap">
              <div className="panel">
                <div className="panel-title">Base</div>
                <div className="muted">prob {pct(whatifResult.base?.prob)} — {whatifResult.base?.label || "—"}</div>
                <ShapBar contribs={whatifResult.base?.contribs || {}} />
              </div>
              <div className="panel">
                <div className="panel-title">Tweaked</div>
                <div className="muted">prob {pct(whatifResult.tweaked?.prob)} — {whatifResult.tweaked?.label || "—"}</div>
                <ShapBar contribs={whatifResult.tweaked?.contribs || {}} />
              </div>
              <div className="delta-pill">Δprob: {pct(whatifResult.delta_prob)}</div>
            </div>
          ) : (
            <div className="empty">Set deltas and click <b>Simulate</b> to compare.</div>
          )}
        </div>
      </section>

      {/* Row 4: Batch + Threshold */}
      <section className="grid two">
        <div className="card">
          <BatchPanel />
        </div>
        <div className="card">
          <ThresholdTuner />
        </div>
      </section>

      {/* Row 5: Global SHAP */}
      <section className="card">
        <div className="card-title">Global SHAP (Cohort)</div>
        <GlobalShapCard />
      </section>

      {/* Row 6: Sessions */}
      <section className="card">
        <div className="card-title">Recent Sessions</div>
        <SessionsTable rows={sessions} />
      </section>

      <footer className="footer muted">
        Dataset: UCI Heart Disease (Cleveland) — Model: Logistic Regression (scaled)
      </footer>
    </div>
  );
}
