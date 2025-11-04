import React, { useEffect, useState } from "react";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function GlobalShapCard(){
  const [labels, setLabels] = useState<string[]>([]);
  const [vals, setVals] = useState<number[]>([]);

  useEffect(()=>{
    fetch("/shap/global") // served by python; CORS is open via API; for simplicity, we proxy through nginx? Here we call through an absolute URL:
      .catch(()=>{}); // Placeholder if direct call blocked. Optional: expose passthrough in API if needed.
  },[]);

  // For a simple static placeholder (avoid CORS): show info
  return (
    <div className="card">
      <h2>Global SHAP (Cohort)</h2>
      {labels.length ? (
        <Bar data={{ labels, datasets:[{ label:"mean |SHAP|", data: vals }]}} options={{ plugins:{ legend:{ display:false }}}}/>
      ) : (
        <div className="muted">For production, expose /shap/global via API passthrough or enable CORS to python.</div>
      )}
    </div>
  );
}
