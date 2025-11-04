const base = import.meta.env.VITE_API_BASE || "http://localhost:8080";

export async function predict(features: any) {
  const r = await fetch(`${base}/predict`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ features }),
  });
  if (!r.ok) throw new Error("predict failed");
  return r.json();
}

export async function whatif(baseFeat: any, deltas: any) {
  const r = await fetch(`${base}/whatif`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ base: baseFeat, deltas }),
  });
  if (!r.ok) throw new Error("whatif failed");
  return r.json();
}

export async function latestSessions() {
  const r = await fetch(`${base}/sessions`);
  if (!r.ok) throw new Error("sessions failed");
  return r.json();
}

export async function batchUploadCsv(file: File) {
  const form = new FormData();
  form.append("file", file);
  const r = await fetch(`${base}/predict-batch`, { method:"POST", body: form });
  if (!r.ok) throw new Error("batch failed");
  const text = await r.text();
  return text;
}

export async function thresholdsGet() {
  const r = await fetch(`${base}/health`);
  return r.json();
}

export async function thresholdsSet(low:number, high:number) {
  const r = await fetch(`${base}/config/thresholds`, {
    method:"POST", headers:{ "content-type":"application/json"},
    body: JSON.stringify({ low, high })
  });
  return r.json();
}

export async function models() {
  const r = await fetch(`${base}/models`);
  return r.json();
}

export async function fetchGlobalShap() {
  // Call Python via API passthrough; for simplicity we use api/health to grab py url isn’t exposed; so we add an API endpoint soon if needed.
  const r = await fetch(`${base}/health`);
  const j = await r.json();
  // For the demo, hit the python directly from browser only if CORS open; simplest: add proxy in API; but we'll call API: add /health then fetch py via API -> not needed. We'll just call /health then fetch /shap/global via API soon. For now we skip and use API passthrough omitted.
  return null;
}

export async function downloadPdf(features:any) {
  const r = await fetch(`${base}/report`, {
    method:"POST", headers: { "content-type":"application/json" },
    body: JSON.stringify({ features })
  });
  if (!r.ok) throw new Error("pdf failed");
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}
