// web/src/api.ts
const B = "/api"; // nginx proxies /api → http://api:8080

// Helpers
async function j<T>(r: Response): Promise<T> {
  if (!r.ok) {
    const txt = await r.text().catch(() => "");
    throw new Error(`${r.status} ${r.statusText}: ${txt}`);
  }
  return r.json();
}

const unifyContribs = (x: any): Record<string, number> => {
  if (!x) return {};
  if (x.contribs) return x.contribs;
  if (x.contrib) return x.contrib;
  if (Array.isArray(x.shap)) {
    const o: Record<string, number> = {};
    for (const pair of x.shap) {
      // tolerate ["feature", value] or [value, "feature"]
      if (Array.isArray(pair) && pair.length >= 2) {
        const k = typeof pair[0] === "string" ? pair[0] : String(pair[1]);
        const v = typeof pair[0] === "number" ? pair[0] : Number(pair[1]);
        if (!Number.isNaN(v)) o[k] = v;
      }
    }
    return o;
  }
  return {};
};

export async function health() {
  return j<any>(await fetch(`${B}/health`));
}

export async function fairness() {
  // used by FairnessDashboard
  return j<any>(await fetch(`${B}/metrics/fairness`));
}

export async function predict(features: Record<string, number>) {
  const r = await j<any>(
    await fetch(`${B}/predict`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(features),
    })
  );
  return {
    prob: r.prob ?? r.score ?? r.risk ?? 0,
    label: r.label ?? r.riskLabel ?? undefined,
    contribs: unifyContribs(r),
  };
}

export async function whatif(
  base: Record<string, number>,
  deltas: Record<string, number>
) {
  const r = await j<any>(
    await fetch(`${B}/whatif`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ base, deltas }),
    })
  );
  // Accept either {delta_prob, base:{prob,contribs}, tweaked:{...}}
  // or {dprob, base:{prob, shap:[...]}, tweaked:{...}}
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
  const r = await j<any>(await fetch(`${B}/shap/global`));
  // Accept {features:[...], shap:[...]} or {importances:{k:v}}
  if (Array.isArray(r.features) && Array.isArray(r.shap)) {
    const o: Record<string, number> = {};
    r.features.forEach((k: string, i: number) => (o[k] = Number(r.shap[i] ?? 0)));
    return o;
  }
  if (r.importances) return r.importances;
  return {};
}

export async function cohortsExplore(payload: any) {
  return j<any>(
    await fetch(`${B}/cohorts/explore`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(payload ?? {}),
    })
  );
}

// web/src/api.ts (drop-in for latestSessions only)
async function _get<T>(path: string) {
  const r = await fetch(path);
  if (!r.ok) throw new Error(String(r.status));
  return r.json() as Promise<T>;
}

function _normalizeSessions(raw: any): any[] {
  // Accept:
  //  - [{ when, model, prob, score }]
  //  - [{ createdAt, modelVersion, riskScore, riskLabel }]
  //  - or nested { rows: [...] }
  const rows = Array.isArray(raw) ? raw : Array.isArray(raw?.rows) ? raw.rows : [];
  return rows.map((r: any) => ({
    id: r.id ?? undefined,
    createdAt: r.createdAt ?? r.when ?? r.timestamp ?? new Date().toISOString(),
    modelVersion: r.modelVersion ?? r.model ?? "unknown",
    riskScore: r.riskScore ?? r.score ?? 0,
    riskLabel: r.prob ?? r.label ?? "",
  }));
}

export async function latestSessions() {
  const bases = ["/api/sessions/latest", "/api/sessions", "/api/session/latest"];
  let lastErr: unknown = null;
  for (const p of bases) {
    try {
      const raw = await _get<any>(p);
      return _normalizeSessions(raw);
    } catch (e) {
      lastErr = e;
    }
  }
  console.warn("No sessions endpoint found", lastErr);
  return [];
}


export async function downloadPdf(features: Record<string, number>) {
  const r = await fetch(`${B}/report.pdf`, {
    method: "POST",
    body: JSON.stringify(features),
    headers: { "content-type": "application/json" },
  });
  if (!r.ok) throw new Error("report failed");
  const blob = await r.blob();
  return URL.createObjectURL(blob);
}

export async function batchUpload(file: File) {
  const fd = new FormData();
  fd.append("file", file); // must be a Blob/File; avoids “not of type Blob”
  return j<any>(
    await fetch(`${B}/batch/upload`, {
      method: "POST",
      body: fd,
    })
  );
}
