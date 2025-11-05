/* web/src/api.ts */
type Json = Record<string, any>;

async function jfetch(path: string, init?: RequestInit) {
  const r = await fetch(path, init);
  if (!r.ok) {
    const text = await r.text().catch(() => "");
    throw new Error(`${path} → ${r.status}: ${text || r.statusText}`);
  }
  const ct = r.headers.get("content-type") || "";
  if (ct.includes("application/json")) return r.json();
  return r.text();
}

export async function health() {
  return jfetch("/api/health");
}

export async function metricsFairness() {
  return jfetch("/api/metrics/fairness");
}

export async function globalShap() {
  return jfetch("/api/shap/global");
}

export async function predict(features: Json) {
  return jfetch("/api/predict", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(features),
  });
}

export async function whatif(base: Json, deltas: Json) {
  return jfetch("/api/whatif", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ base, deltas }),
  });
}

export async function batchUpload(file: File) {
  const fd = new FormData();
  fd.append("file", file, file.name); // must be a Blob/File
  return jfetch("/api/batch/upload", { method: "POST", body: fd });
}

export async function downloadPdfBlob(features: Json) {
  const r = await fetch("/api/report.pdf", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(features),
  });
  if (!r.ok) {
    const t = await r.text().catch(() => "");
    throw new Error(`/api/report.pdf → ${r.status}: ${t || r.statusText}`);
  }
  return r.blob();
}

export async function downloadPdf(features: Json) {
  const blob = await downloadPdfBlob(features);
  return URL.createObjectURL(blob); // caller is responsible for revokeObjectURL
}

/* Map API /sessions → your table’s expected shape */
function labelFromProb(p: number, low=0.33, high=0.66) {
  if (p < low) return "Low";
  if (p < high) return "Medium";
  return "High";
}

export async function latestSessions() {
  const rows = await jfetch("/api/sessions");
  if (!Array.isArray(rows)) return [];
  return rows.map((r: any, i: number) => ({
    id: i,
    createdAt: r.when,               // ISO string from API
    modelVersion: r.model,
    riskLabel: labelFromProb(Number(r.prob ?? r.score ?? 0)),
    riskScore: Number(r.score ?? r.prob ?? 0),
  }));
}

// web/src/api.ts
// …your existing exports…

export type CohortExploreReq = {
  sex?: 0 | 1;          // omit if "(any)"
  ageMin?: number;      // omit if blank
  ageMax?: number;      // omit if blank
  cpList?: number[];    // omit if blank
};

export async function cohortsExplore(req: CohortExploreReq) {
  // strip undefined to keep payload clean
  const body: Record<string, unknown> = {};
  if (req.sex !== undefined) body.sex = req.sex;
  if (Number.isFinite(req.ageMin!)) body.ageMin = req.ageMin;
  if (Number.isFinite(req.ageMax!)) body.ageMax = req.ageMax;
  if (req.cpList && req.cpList.length) body.cpList = req.cpList;

  const r = await fetch("/api/cohorts/explore", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!r.ok) {
    // return the raw text so you can see API’s message in UI
    const txt = await r.text();
    throw new Error(`/api/cohorts/explore → ${r.status}: ${txt}`);
  }
  return r.json();
}

