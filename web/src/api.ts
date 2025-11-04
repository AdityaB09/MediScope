// web/src/api.ts
const BASE = "/api"; // nginx proxies /api/* -> http://api:8080/*

export type Patient = {
  age: number; sex: number; cp: number; trestbps: number; chol: number;
  fbs: number; restecg: number; thalach: number; exang: number;
  oldpeak: number; slope: number; ca: number; thal: number;
};

async function json<T>(path: string, init?: RequestInit): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    headers: { "content-type": "application/json" },
    ...init,
  });
  if (!r.ok) throw new Error(`${path} -> ${r.status}`);
  return r.json();
}

export async function health() {
  return json<{ status: string; py?: any }>("/health");
}

export async function predict(p: Patient) {
  return json<{ prob: number; shap: Array<[string, number]> }>("/predict", {
    method: "POST",
    body: JSON.stringify(p),
  });
}

export async function whatif(base: Patient, tweaked: Partial<Patient>) {
  return json<{
    base: { prob: number; shap: Array<[string, number]> };
    tweaked: { prob: number; shap: Array<[string, number]> };
    dprob: number;
  }>("/whatif", {
    method: "POST",
    body: JSON.stringify({ base, tweaked }),
  });
}

export async function cohorts(payload: {
  sex?: number; age_min?: number; age_max?: number; cp?: number[];
}) {
  return json<{ summary: any; examples: any[] }>("/cohorts/explore", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function fairness() {
  return json<{ status: string; groups: any; metrics: { accuracy: number|null } }>(
    "/metrics/fairness"
  );
}

export async function globalShap() {
  // returns {status:"ok", features:[string[]], shap:[number[]]}
  return json<{ status: string; features: string[]; shap: number[] }>("/shap/global");
}

export async function batchUploadCsv(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name);
  const r = await fetch(`${BASE}/batch/upload`, { method: "POST", body: fd });
  if (!r.ok) throw new Error(`/batch/upload -> ${r.status}`);
  return r.json();
}

export async function latestSessions() {
  // [{when: "2025-11-04T18:22:51.000Z", model:"heart-v1", prob:0.37, score:0.37}]
  return json<Array<{ when: string; model: string; prob: number; score: number }>>("/sessions");
}

export async function downloadPdf() {
  const r = await fetch(`${BASE}/report.pdf`);
  if (!r.ok) throw new Error("report.pdf failed");
  const blob = await r.blob();
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url; a.download = "report.pdf"; a.click();
  URL.revokeObjectURL(url);
}
