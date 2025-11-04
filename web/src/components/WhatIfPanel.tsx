import React, { useState } from "react";
import { featureList } from "./PatientForm";

export default function WhatIfPanel({ base, onRun }:{ base:any, onRun:(deltas:any)=>void }) {
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
        <button onClick={()=>onRun(deltas)}>Simulate</button>
      </div>
      {!base && <div className="muted" style={{marginTop:8}}>Run a base prediction first.</div>}
    </div>
  );
}
