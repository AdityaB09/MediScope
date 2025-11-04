# python/service.py
import io, os, json, time
from typing import Any, Dict, List, Tuple
from flask import Flask, request, jsonify, send_file
import pandas as pd
import numpy as np
from sklearn.model_selection import train_test_split
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score
import joblib

app = Flask(__name__)

DATA_PATH = os.environ.get("DATA_PATH", "/app/data/heart.csv")
MODELS_DIR = "/app/models"
os.makedirs(MODELS_DIR, exist_ok=True)

FEATURES = ["age","sex","cp","trestbps","chol","fbs","restecg",
            "thalach","exang","oldpeak","slope","ca","thal"]
TARGET = "target"
MODEL_PATH = os.path.join(MODELS_DIR, "lr.joblib")

def _load_dataset_with_y() -> pd.DataFrame:
    df = pd.read_csv(DATA_PATH)
    # if there isn't a 'target', generate one (demo)
    if TARGET not in df.columns:
        # create synthetic label for demo
        df[TARGET] = (df["thalach"] > df["thalach"].median()).astype(int)
    return df

def _train_and_persist():
    df = _load_dataset_with_y()
    X = df[FEATURES].values
    y = df[TARGET].values
    Xtr, Xte, ytr, yte = train_test_split(X, y, test_size=0.2, random_state=42)
    clf = LogisticRegression(max_iter=1000)
    clf.fit(Xtr, ytr)
    joblib.dump({"model": clf, "features": FEATURES}, MODEL_PATH)

def _load_model() -> Dict[str, Any]:
    if not os.path.exists(MODEL_PATH):
        _train_and_persist()
    return joblib.load(MODEL_PATH)

MODEL = _load_model()
VERSION = "heart-v1"

def _predict_proba(row: Dict[str, float]) -> float:
    X = np.array([[row[f] for f in FEATURES]], dtype=float)
    clf = MODEL["model"]
    prob = float(clf.predict_proba(X)[0,1])
    return prob

def _fake_shap(row: Dict[str, float]) -> List[Tuple[str, float]]:
    # lightweight "importance" = coefficient * value (demo)
    coefs = MODEL["model"].coef_[0]
    vals = np.array([row[f] for f in FEATURES], dtype=float)
    contrib = coefs * (vals - np.mean(vals))
    return list(zip(FEATURES, contrib.tolist()))

@app.get("/health")
def health():
    return jsonify({"status": "ok", "version": VERSION, "features": FEATURES})

@app.get("/metrics/fairness")
def fairness():
    df = _load_dataset_with_y()
    # basic parity by sex
    g = df.groupby("sex")[TARGET].agg(["count", "mean"]).rename(columns={"mean":"positive_rate"})
    groups = {
        "sex": {
            "count": {str(int(k)): int(v) for k, v in g["count"].to_dict().items()},
            "positive_rate": {str(int(k)): float(v) for k, v in g["positive_rate"].to_dict().items()},
        }
    }
    # optional accuracy if model present
    try:
        X = df[FEATURES].values; y = df[TARGET].values
        pred = MODEL["model"].predict(X)
        acc = float(accuracy_score(y, pred))
    except Exception:
        acc = None
    return jsonify({"status":"ok","groups":groups,"metrics":{"accuracy":acc}})

@app.post("/cohorts/explore")
def cohorts_explore():
    q = request.get_json(silent=True) or {}
    df = _load_dataset_with_y()

    if "sex" in q: df = df[df["sex"] == int(q["sex"])]
    if "age_min" in q: df = df[df["age"] >= float(q["age_min"])]
    if "age_max" in q: df = df[df["age"] <= float(q["age_max"])]
    if "cp" in q and q["cp"]:
        df = df[df["cp"].isin([int(x) for x in q["cp"]])]

    examples = df.head(10)[FEATURES + [TARGET]].to_dict(orient="records")
    summary = {
        "count": int(len(df)),
        "mean": {k: float(df[k].mean()) for k in FEATURES},
        "positive_rate": float(df[TARGET].mean())
    }
    return jsonify({"status":"ok","summary":summary,"examples":examples})

@app.post("/predict")
def predict():
    row = request.get_json(silent=True) or {}
    row = {k: float(row.get(k, 0)) for k in FEATURES}
    prob = _predict_proba(row)
    shap = _fake_shap(row)
    return jsonify({"prob":prob, "shap":shap, "model":VERSION})

@app.post("/whatif")
def whatif():
    payload = request.get_json(silent=True) or {}
    base = {k: float(payload.get("base", {}).get(k, 0)) for k in FEATURES}
    tweaked = base.copy()
    for k,v in (payload.get("tweaked") or {}).items():
        if k in tweaked: tweaked[k] = float(v)
    p0 = _predict_proba(base)
    p1 = _predict_proba(tweaked)
    return jsonify({
        "base": {"prob": p0, "shap": _fake_shap(base)},
        "tweaked": {"prob": p1, "shap": _fake_shap(tweaked)},
        "dprob": p1 - p0
    })

@app.post("/batch/upload")
def batch_upload():
    if "file" not in request.files:
        return jsonify({"error":"file required"}), 400
    f = request.files["file"]
    df = pd.read_csv(f)
    # ensure required columns exist
    missing = [c for c in FEATURES if c not in df.columns]
    if missing: return jsonify({"error": f"missing columns: {missing}"}), 400
    rows = df[FEATURES].to_dict(orient="records")
    out = []
    for r in rows:
        out.append({"prob": _predict_proba(r)})
    return jsonify({"count": len(out), "results": out})

@app.get("/shap/global")
def shap_global():
    df = _load_dataset_with_y()
    # cheap global attributions: correlation with target (abs)
    S = []
    for f in FEATURES:
        try:
            S.append(abs(df[f].corr(df[TARGET])))
        except Exception:
            S.append(0.0)
    return jsonify({"status":"ok","features":FEATURES,"shap":S})

@app.get("/report.pdf")
def report_pdf():
    # tiny inline PDF so the button works
    raw = (
        "JVBERi0xLjQKJeLjz9MKMSAwIG9iago8PC9UeXBlIC9DYXRhbG9nPj4KZW5kb2JqCnhyZWYK"
        "MCAyCjAwMDAwMDAwMDAgNjU1MzUgZiAKMDAwMDAwMDAxMCAwMDAwMCBuIAp0cmFpbGVyCjw8"
        "L1Jvb3QgMSAwIFI+PgpzdGFydHhyZWYKMjYKYm9vdGxlbmQK"
    )
    b = io.BytesIO(base64.b64decode(raw))
    b.seek(0)
    return send_file(b, mimetype="application/pdf", download_name="report.pdf")

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=8001)
