// web/src/api.ts
// --- Base URL resolution ---
// Priority: VITE_API_BASE (Netlify), global override, else local nginx proxy "/api".
const BASE =
  (import.meta as any).env?.VITE_API_BASE?.replace(/\/+$/, "") ||
  (globalThis as any).__API_BASE?.replace?.(/\/+$/, "") ||
  "/api";

// --- tiny helpers ---
async function ensureOk<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}: ${txt}`);
  }
  return r.json();
}
async function jget<T>(path: string): Promise<T> {
  const r = await fetch(`${BASE}${path}`);
  return ensureOk<T>(r);
}
async function jpost<T>(path: string, body: any): Promise<T> {
  const r = await fetch(`${BASE}${path}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body ?? {}),
  });
  return ensureOk<T>(r);
}

// --- unify contrib/SHAP shapes from Python ---
const unifyContribs = (x: any): Record<string, number> => {
  if (!x) return {};
  if (x.contribs) return x.contribs;
  if (x.contrib) return x.contrib;
  // Accept SHAP as array of pairs: [["feature", value], ...] or [value,"feature"]
  if (Array.isArray(x.shap)) {
    const out: Record<string, number> = {};
    for (const pair of x.shap) {
      if (!Array.isArray(pair) || pair.length < 2) continue;
      const k = typeof pair[0] === "string" ? pair[0] : String(pair[1]);
      const v = typeof pair[0] === "number" ? pair[0] : Number(pair[1]);
      if (!Number.isNaN(v)) out[k] = v;
    }
    return out;
  }
  return {};
};

// --- public API used by your components ---

export const health = () => jget<any>("/health");

export const fairness = () => jget<any>("/metrics/fairness");

export async function predict(features: Record<string, number>) {
  const r = await jpost<any>("/predict", features);
  return {
    prob: r.prob ?? r.score ?? r.risk ?? 0,
    // If you want High/Low in UI, map there; keep backend-agnostic here.
    label: r.label ?? r.riskLabel ?? undefined,
    contribs: unifyContribs(r),
  };
}

export async function whatif(
  base: Record<string, number>,
  deltas: Record<string, number>
) {
  const r = await jpost<any>("/whatif", { base, deltas });
  return {
    delta_prob: r.delta_prob ?? r.dprob ?? 0,
    base: {
      prob: r.base?.prob ?? r.base_prob ?? null,
      label: r.base?.label,
      contribs: unifyContribs(r.base),
    },
    tweaked: {
      prob: r.tweaked?.prob ?? r.tweaked_prob ?? null,
      label: r.tweaked?.label,
      contribs: unifyContribs(r.tweaked),
    },
  };
}

export async function globalShap() {
  const r = await jget<any>("/shap/global");
  // Accept {features:[...], shap:[...]} or {importances:{k:v}}
  if (Array.isArray(r.features) && Array.isArray(r.shap)) {
    const out: Record<string, number> = {};
    r.features.forEach((k: string, i: number) => (out[k] = Number(r.shap[i] ?? 0)));
    return out;
  }
  if (r.importances) return r.importances as Record<string, number>;
  return {};
}

// Cohorts explorer (your component calls this)
export const cohortsExplore = (payload: any) => jpost<any>("/cohorts/explore", payload);
// Back-compat alias if some file imports `cohExplore`
export const cohExplore = cohortsExplore;

// Sessions: tolerate several backend shapes
async function _rawGet<T>(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}
function _normalizeSessions(raw: any): any[] {
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
  return rows.map((r: any) => ({
    id: r.id ?? undefined,
    createdAt: r.createdAt ?? r.when ?? r.timestamp ?? new Date().toISOString(),
    modelVersion: r.modelVersion ?? r.model ?? "unknown",
    riskScore: r.riskScore ?? r.score ?? r.prob ?? 0,
    riskLabel: r.riskLabel ?? r.label ?? (r.prob != null ? (r.prob > 0.5 ? "High" : "Low") : ""),
  }));
}
export async function latestSessions() {
  const paths = [`${BASE}/sessions/latest`, `${BASE}/sessions`, `${BASE}/session/latest`];
  let lastErr: unknown = null;
  for (const p of paths) {
    try {
      const raw = await _rawGet<any>(p);
      return _normalizeSessions(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn("No sessions endpoint found", lastErr);
  return [];
}

// Report download:
// Prefer GET /report.pdf (your API supports it). If it ever needs features, we’ll fallback to POST.
export async function downloadPdf(features?: Record<string, number>) {
  // Try GET first
  const tryGet = async () => {
    const r = await fetch(`${BASE}/report.pdf`);
    if (!r.ok) throw new Error(await r.text());
    return URL.createObjectURL(await r.blob());
  };
  try {
    return await tryGet();
  } catch {
    if (!features) throw new Error("report failed (GET) and no features provided for POST");
    const r = await fetch(`${BASE}/report.pdf`, {
      method: "POST",
      body: JSON.stringify(features),
      headers: { "content-type": "application/json" },
    });
    if (!r.ok) throw new Error(await r.text());
    return URL.createObjectURL(await r.blob());
  }
}

export async function batchUpload(file: File) {
  const fd = new FormData();
  fd.append("file", file);
  const r = await fetch(`${BASE}/batch/upload`, {
    method: "POST",
    body: fd,
  });
  return ensureOk<any>(r);
}
