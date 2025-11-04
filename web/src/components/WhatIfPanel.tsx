import React, { useState } from "react";
import { featureList } from "./PatientForm";

export default function WhatIfPanel({
  base,
  basePredReady,
  onRun
}:{
  base:any;
  basePredReady:boolean;
  onRun:(deltas:any)=>void;
}) {
  const [deltas, setDeltas] = useState<Record<string, number>>({});
  const set = (k:string, v:number)=> setDeltas(s=>({...s, [k]: v}));

  return (
    <div className="card">
      <h2>What-If Explorer</h2>
      <div className="row">
        {featureList.map(f=>(
          <div key={f}>
            <label className="muted">{f} Δ</label>
            <input type="number" step="any" value={deltas[f] ?? 0}
                   onChange={e=>set(f, Number(e.target.value))}/>
          </div>
        ))}
      </div>
      <div style={{marginTop:12}}>
        <button
          className="btn"
          disabled={!base || !basePredReady}     // ✅ lock until base prediction exists
          onClick={()=>onRun(deltas)}
          title={!base || !basePredReady ? "Run a base prediction first" : "Simulate"}
        >
          Simulate
        </button>
      </div>
      {(!base || !basePredReady) && (
        <div className="muted" style={{marginTop:8}}>Run a base prediction first.</div>
      )}
    </div>
  );
}
