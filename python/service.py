import os, io, json, joblib
from datetime import datetime
import numpy as np
import pandas as pd
from flask import Flask, request, send_file, jsonify

import shap

MODEL_DIR = os.getenv("MODEL_DIR", "/app/models")
DEFAULT_LOW = float(os.getenv("LOW_THRESHOLD", "0.33"))
DEFAULT_HIGH = float(os.getenv("HIGH_THRESHOLD", "0.66"))

LOW = DEFAULT_LOW
HIGH = DEFAULT_HIGH

def _latest_version():
    p = os.path.join(MODEL_DIR, "latest.txt")
    if os.path.exists(p):
        return open(p).read().strip()
    # fallback: most recent pkl
    picks = [f for f in os.listdir(MODEL_DIR) if f.endswith(".pkl")]
    if not picks:
        raise RuntimeError("No model artifacts found in /app/models")
    picks.sort(reverse=True)
    return picks[0].replace("model_", "").replace(".pkl", "")

def _load(version: str):
    path = os.path.join(MODEL_DIR, f"model_{version}.pkl")
    art = joblib.load(path)
    pipe = art["pipeline"]
    feat = art["feature_names"]
    bg = art["background"]

    # Ensure background is DataFrame with right columns
    if isinstance(bg, pd.DataFrame):
        bg_df = bg[feat]
    else:
        bg_df = pd.DataFrame(bg, columns=feat)

    # Build callable that returns positive-class probability from the pipeline
    def f(X):
        if isinstance(X, pd.DataFrame):
            Xdf = X[feat]
        else:
            Xdf = pd.DataFrame(X, columns=feat)
        return pipe.predict_proba(Xdf)[:, 1]

    # Try fast path; if SHAP rejects, use KernelExplainer
    try:
        explainer = shap.Explainer(f, bg_df, algorithm="auto")
        # quick probe (small slice) to force init
        _ = explainer(bg_df.head(5))
    except Exception:
        explainer = shap.KernelExplainer(f, bg_df)

    return art, f, explainer, feat

VERSION = _latest_version()
ART, PRED_FN, EXPLAINER, FEATURE_NAMES = _load(VERSION)

app = Flask(__name__)

@app.get("/health")
def health():
    return jsonify({
        "status": "ok",
        "version": VERSION,
        "low": LOW,
        "high": HIGH,
        "features": FEATURE_NAMES,
        "metrics": ART.get("metrics", {})
    })

@app.get("/models")
def models():
    return jsonify({
        "current": VERSION,
        "features": FEATURE_NAMES,
        "metrics": ART.get("metrics", {})
    })

@app.post("/config/thresholds")
def cfg_thresholds():
    global LOW, HIGH
    body = request.get_json(force=True, silent=True) or {}
    LOW = float(body.get("low", LOW))
    HIGH = float(body.get("high", HIGH))
    return jsonify({"low": LOW, "high": HIGH})

def _label(p):
    if p >= HIGH: return "High"
    if p >= LOW:  return "Medium"
    return "Low"

@app.post("/predict")
def predict():
    body = request.get_json(force=True)
    features = body.get("features", {})
    # order to model schema
    x = pd.DataFrame([[features.get(k, 0) for k in FEATURE_NAMES]], columns=FEATURE_NAMES)
    prob = float(PRED_FN(x)[0])
    label = _label(prob)
    # SHAP per-instance
    try:
        sv = EXPLAINER(x)
        contribs = {FEATURE_NAMES[i]: float(sv.values[0][i]) for i in range(len(FEATURE_NAMES))}
    except Exception:
        contribs = {k: 0.0 for k in FEATURE_NAMES}

    return jsonify({
        "version": VERSION,
        "prob": prob,
        "label": label,
        "contribs": contribs
    })

@app.post("/batch")
def batch():
    if "file" not in request.files:
        return ("file missing", 400)
    f = request.files["file"]
    df = pd.read_csv(f)
    # align columns
    X = pd.DataFrame({k: df[k] if k in df.columns else 0 for k in FEATURE_NAMES})
    probs = PRED_FN(X)
    labels = [_label(float(p)) for p in probs]
    out = df.copy()
    out["prob"] = probs
    out["label"] = labels

    buf = io.StringIO()
    out.to_csv(buf, index=False)
    buf.seek(0)
    return buf.getvalue(), 200, {"Content-Type": "text/csv"}

@app.post("/whatif")
def whatif():
    body = request.get_json(force=True)
    base = body.get("base", {})
    tweaks = body.get("delta", {})
    candidate = {k: base.get(k, 0) for k in FEATURE_NAMES}
    candidate.update(tweaks)
    x = pd.DataFrame([[candidate[k] for k in FEATURE_NAMES]], columns=FEATURE_NAMES)
    prob = float(PRED_FN(x)[0])
    return jsonify({"prob": prob, "label": _label(prob), "features": candidate})

@app.get("/shap/global")
def shap_global():
    # compute mean |SHAP| over a modest sample for speed
    try:
        bg = ART["background"]
        bg_df = bg if isinstance(bg, pd.DataFrame) else pd.DataFrame(bg, columns=FEATURE_NAMES)
        sample = bg_df.sample(min(200, len(bg_df)), random_state=42)
        sv = EXPLAINER(sample)
        imp = np.mean(np.abs(sv.values), axis=0)
        top = sorted(
            [{"feature": FEATURE_NAMES[i], "importance": float(imp[i])} for i in range(len(FEATURE_NAMES))],
            key=lambda d: d["importance"],
            reverse=True
        )[:15]
    except Exception:
        top = [{"feature": k, "importance": 0.0} for k in FEATURE_NAMES]
    return jsonify({"top": top})

@app.post("/report/pdf")
def report_pdf():
    # Minimal placeholder PDF; integrate your util_report if desired
    from reportlab.lib.pagesizes import letter
    from reportlab.pdfgen import canvas
    buf = io.BytesIO()
    c = canvas.Canvas(buf, pagesize=letter)
    c.drawString(72, 720, f"MediScope Risk Report — {datetime.utcnow().isoformat()}Z")
    c.drawString(72, 700, f"Model version: {VERSION}")
    c.drawString(72, 680, f"Thresholds: low={LOW:.2f} high={HIGH:.2f}")
    c.showPage(); c.save()
    buf.seek(0)
    return send_file(buf, mimetype="application/pdf", as_attachment=True, download_name="mediscope_report.pdf")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)
