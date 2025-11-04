import React, { useEffect, useState } from "react";
import PatientForm from "./components/PatientForm";
import RiskGauge from "./components/RiskGauge";
import ShapBar from "./components/ShapBar";
import WhatIfPanel from "./components/WhatIfPanel";
import BatchPanel from "./components/BatchPanel";
import ThresholdTuner from "./components/ThresholdTuner";
import GlobalShapCard from "./components/GlobalShapCard";
import { predict, latestSessions, whatif, downloadPdf } from "./api";

export default function App() {
  const [result, setResult] = useState<any>(null);
  const [lastFeatures, setLastFeatures] = useState<any>(null);
  const [sessions, setSessions] = useState<any[]>([]);
  const [whatifResult, setWhatIf] = useState<any>(null);

  const doPredict = async (features:any) => {
    setLastFeatures(features);
    const r = await predict(features);
    setResult(r);
    const s = await latestSessions();
    setSessions(s);
    setWhatIf(null);
  };

  const runWhatIf = async (deltas:any)=>{
    if (!lastFeatures) return;
    const j = await whatif(lastFeatures, deltas);
    setWhatIf(j);
  };

  const makePdf = async (features:any)=>{
    const url = await downloadPdf(features);
    const a = document.createElement("a");
    a.href = url; a.download = "mediscope_report.pdf";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  useEffect(() => { latestSessions().then(setSessions).catch(()=>{}); }, []);

  return (
    <div className="container">
      <div style={{display:"flex", justifyContent:"space-between", alignItems:"baseline"}}>
        <div style={{fontWeight:800, fontSize:24}}>MediScope — Predictive Healthcare</div>
        <a href="http://localhost:8080/swagger" target="_blank">API Docs</a>
      </div>

      <div className="grid-2">
        <PatientForm onSubmit={doPredict} onPdf={makePdf}/>
        <div>
          {result ? (
            <>
              <RiskGauge prob={result.prob} label={result.label} />
              <ShapBar contribs={result.contribs} />
            </>
          ) : (
            <div className="card"><h2>No prediction yet</h2>
              <div className="muted">Enter features and click Predict.</div></div>
          )}
        </div>
      </div>

      <div className="grid-2">
        <WhatIfPanel base={lastFeatures} onRun={runWhatIf}/>
        <div className="card">
          <h2>What-If Result</h2>
          {whatifResult ? (
            <div>
              <div>Δprob: {(whatifResult.delta_prob*100).toFixed(2)}%</div>
              <div className="grid-2" style={{marginTop:8}}>
                <div>
                  <h3>Base</h3>
                  <div className="muted">prob {(whatifResult.base.prob*100).toFixed(1)}% — {whatifResult.base.label}</div>
                  <ShapBar contribs={whatifResult.base.contribs}/>
                </div>
                <div>
                  <h3>Tweaked</h3>
                  <div className="muted">prob {(whatifResult.tweaked.prob*100).toFixed(1)}% — {whatifResult.tweaked.label}</div>
                  <ShapBar contribs={whatifResult.tweaked.contribs}/>
                </div>
              </div>
            </div>
          ) : <div className="muted">Set deltas and run to compare.</div>}
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
            {sessions.map((s:any)=>(
              <tr key={s.id}>
                <td>{new Date(s.createdAt).toLocaleString()}</td>
                <td>{s.modelVersion}</td>
                <td>{s.riskLabel}</td>
                <td>{(s.riskScore*100).toFixed(1)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="muted">Dataset: UCI Heart Disease (Cleveland); Model: Logistic Regression (scaled). Features match heart.csv.</div>
    </div>
  );
}
