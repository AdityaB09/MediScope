import React from "react";
import { Bar } from "react-chartjs-2";
import { Chart, BarElement, CategoryScale, LinearScale, Tooltip, Legend } from "chart.js";
Chart.register(BarElement, CategoryScale, LinearScale, Tooltip, Legend);

export default function ShapBar({ contribs }:{ contribs: Record<string, number> }) {
  const entries = Object.entries(contribs || {});
  entries.sort((a,b)=>Math.abs(b[1]) - Math.abs(a[1]));
  const labels = entries.map(e=>e[0]).slice(0,10);
  const dataVals = entries.map(e=>e[1]).slice(0,10);

  return (
    <div className="card">
      <h2>Top Feature Contributions (SHAP)</h2>
      <Bar
        data={{ labels, datasets: [{ label: "Contribution", data: dataVals }] }}
        options={{ responsive: true, plugins: { legend: { display: false }}}}
      />
    </div>
  );
}
