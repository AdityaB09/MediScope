import React, { useState } from "react";

export const featureList = [
  "age","sex","cp","trestbps","chol","fbs","restecg","thalach","exang","oldpeak","slope","ca","thal"
];

const defaults: Record<string, number> = {
  age: 54, sex: 1, cp: 0, trestbps: 130, chol: 246, fbs: 0, restecg: 0,
  thalach: 150, exang: 0, oldpeak: 1, slope: 1, ca: 0, thal: 2
};

export default function PatientForm({ onSubmit, onPdf }:{ onSubmit:(f:any)=>void, onPdf:(f:any)=>void }) {
  const [vals, setVals] = useState<Record<string, number>>(defaults);
  const set = (k: string, v: number) => setVals(s => ({...s, [k]: v}));

  return (
    <div className="card">
      <h2>Patient Features</h2>
      <div className="row">
        {featureList.map(f => (
          <div key={f}>
            <label className="muted">{f}</label>
            <input type="number" value={vals[f]} step="any"
               onChange={e=>set(f, Number(e.target.value))} />
          </div>
        ))}
      </div>
      <div className="actions" style={{marginTop:12}}>
        <button onClick={()=>onSubmit(vals)}>Predict Risk</button>
        <button onClick={()=>setVals(defaults)}>Reset</button>
        <button onClick={()=>onPdf(vals)}>Download PDF</button>
      </div>
    </div>
  );
}
