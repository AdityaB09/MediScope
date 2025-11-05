/* web/src/components/BatchPanel.tsx */
import React, { useRef, useState } from "react";
import { batchUpload } from "../api";

export default function BatchPanel() {
  const fileRef = useRef<HTMLInputElement | null>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string>("");
  const [result, setResult] = useState<any>(null);

  async function onUpload() {
    setMsg("");
    setResult(null);
    const input = fileRef.current;
    const file = input?.files?.[0];
    if (!file) {
      setMsg("Please choose a CSV file first.");
      return;
    }
    if (!file.name.toLowerCase().endsWith(".csv")) {
      setMsg("Only .csv files are supported.");
      return;
    }
    setBusy(true);
    try {
      const j = await batchUpload(file);
      setResult(j);
      setMsg("Uploaded ✓");
    } catch (e: any) {
      setMsg(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card">
      <h2>Batch Scoring (CSV)</h2>
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <input ref={fileRef} type="file" accept=".csv" />
        <button className="btn" onClick={onUpload} disabled={busy}>
          {busy ? "Uploading…" : "Upload"}
        </button>
      </div>
      {msg && <div className="muted" style={{ marginTop: 8 }}>{msg}</div>}
      {result && (
        <pre style={{ marginTop: 8, maxHeight: 220, overflow: "auto" }}>
          {JSON.stringify(result, null, 2)}
        </pre>
      )}
    </div>
  );
}
