import React, { useEffect, useState } from "react";

export default function ThresholdTuner() {
  const [low, setLow] = useState(0.33);
  const [high, setHigh] = useState(0.66);
  const [status, setStatus] = useState<string>("");

  useEffect(() => {
    fetch("http://localhost:8080/health")
      .then((r) => r.json())
      .then((j) => {
        const py = j.py;
        if (py && typeof py.low === "number" && typeof py.high === "number") {
          setLow(py.low);
          setHigh(py.high);
        }
      })
      .catch(() => {});
  }, []);

  const save = async () => {
    setStatus("Saving…");
    try {
      const r = await fetch("http://localhost:8080/config/thresholds", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ low, high }),
      });
      const j = await r.json();
      if (typeof j.low === "number") setLow(j.low);
      if (typeof j.high === "number") setHigh(j.high);
      setStatus("Saved.");
    } catch {
      setStatus("Failed.");
    }
  };

  return (
    <div className="card">
      <h2>Threshold Tuning</h2>
      <div className="row">
        <div>
          <label className="muted">Low threshold</label>
          <input
            type="number"
            step="0.01"
            value={low}
            onChange={(e) => setLow(Number(e.target.value))}
          />
        </div>
        <div>
          <label className="muted">High threshold</label>
          <input
            type="number"
            step="0.01"
            value={high}
            onChange={(e) => setHigh(Number(e.target.value))}
          />
        </div>
      </div>
      <div style={{ marginTop: 8, display: "flex", gap: 8, alignItems: "center" }}>
        <button onClick={save}>Save thresholds</button>
        <span className="muted">{status}</span>
      </div>
    </div>
  );
}
