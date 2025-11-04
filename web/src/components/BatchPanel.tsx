import React, { useState } from "react";
import { batchUploadCsv } from "../api";

export default function BatchPanel(){
  const [csv, setCsv] = useState<string>("");
  const [file, setFile] = useState<File|null>(null);

  const onUpload = async ()=>{
    if (!file) return;
    const text = await batchUploadCsv(file);
    setCsv(text);
  };

  return (
    <div className="card">
      <h2>Batch Scoring (CSV)</h2>
      <input type="file" accept=".csv" onChange={e=>setFile(e.target.files?.[0] ?? null)} />
      <div style={{marginTop:8}}>
        <button onClick={onUpload}>Score</button>
      </div>
      {csv && (
        <div style={{marginTop:12}}>
          <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`} download="batch_results.csv">Download results.csv</a>
          <pre style={{whiteSpace:"pre-wrap"}} className="muted">{csv.slice(0,800)}...</pre>
        </div>
      )}
    </div>
  );
}
