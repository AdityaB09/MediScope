import React from "react";
export default function RiskGauge({ prob, label }:{prob:number, label:string}) {
  const pct = Math.round(prob*100);
  const hue = (1 - prob) * 120;
  return (
    <div className="card">
      <h2>Risk</h2>
      <div style={{display:"flex", alignItems:"center", gap:16}}>
        <div style={{
          width:120, height:120, borderRadius:"50%",
          background:`conic-gradient(hsl(${hue},90%,50%) ${pct}%, #1f2937 ${pct}%)`,
          display:"grid", placeItems:"center", border:"6px solid #1f2937"
        }}>
          <div style={{textAlign:"center"}}>
            <div style={{fontSize:20, fontWeight:800}}>{pct}%</div>
            <div className="muted">prob</div>
          </div>
        </div>
        <div>
          <div style={{fontSize:28, fontWeight:800}}>{label}</div>
          <div className="muted">Low &lt; 33%, Medium 33–66%, High ≥ 66%</div>
        </div>
      </div>
    </div>
  );
}
