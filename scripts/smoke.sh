#!/usr/bin/env bash
set -Eeuo pipefail

# --- tiny helpers -------------------------------------------------------------
bold() { printf "\033[1m%s\033[0m\n" "$*"; }
ok()   { printf "\033[32m✔ %s\033[0m\n" "$*"; }
warn() { printf "\033[33m⚠ %s\033[0m\n" "$*"; }
err()  { printf "\033[31m✘ %s\033[0m\n" "$*" >&2; }

_jq() {
  if command -v jq >/dev/null 2>&1; then jq .; else cat; fi
}

wait_http() {
  # wait_http URL [label]
  local url="$1"; local label="${2:-$1}"
  printf "⏳ waiting for %s ..." "$label"
  local tries=0
  until curl -sf "$url" >/dev/null; do
    tries=$((tries+1))
    if [ "$tries" -gt 180 ]; then echo; err "timeout waiting for $label"; exit 1; fi
    printf "."
    sleep 1
  done
  echo; ok "$label ready"
}

post_json() {
  # post_json URL JSON
  local url="$1"; shift
  local body="$*"
  curl -sSf -H 'content-type: application/json' -X POST "$url" -d "$body"
}

# --- paths & env --------------------------------------------------------------
ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
cd "$ROOT_DIR"

API="http://localhost:8080"
WEB="http://localhost:5173"
PY="http://localhost:8001"

DATA_CSV="data/heart.csv"
SAMPLE_CSV="sample.csv"
REPORT_OUT="report_$(date +%Y%m%d_%H%M%S).pdf"

bold "MediScope smoke test (fresh build unless SKIP_BUILD=1)"

# --- dataset presence ---------------------------------------------------------
if [ ! -f "$DATA_CSV" ]; then
  err "Missing $DATA_CSV (must be a FILE). Put the heart dataset there."
  exit 1
fi
ok "Found dataset file: $DATA_CSV ($(wc -c < "$DATA_CSV") bytes)"

# --- compose up ---------------------------------------------------------------
if [ "${SKIP_BUILD:-}" != "1" ]; then
  bold "Rebuilding & starting containers (this will remove old volumes)"
  docker compose down -v || true
  docker compose build --no-cache
  docker compose up -d
else
  bold "Starting containers without rebuild"
  docker compose up -d
fi

# --- readiness gates ----------------------------------------------------------
wait_http "$PY/health"      "python service"
wait_http "$API/health"     "api"
# nginx proxy in web will forward /api/* → api service
wait_http "$WEB/api/health" "web proxy → api"

# --- health -------------------------------------------------------------------
bold "1) Health"
curl -s "$API/health" | _jq
curl -s "$WEB/api/health" | _jq
ok "Health OK"

# --- fairness -----------------------------------------------------------------
bold "2) Fairness"
curl -s "$API/metrics/fairness" | _jq
curl -s "$WEB/api/metrics/fairness" | _jq
ok "Fairness OK"

# --- predict (also inserts a session row) ------------------------------------
bold "3) Predict"
REQ1='{"age":54,"sex":1,"cp":0,"trestbps":130,"chol":246,"fbs":0,"restecg":0,"thalach":150,"exang":0,"oldpeak":1.0,"slope":2,"ca":0,"thal":2}'
post_json "$API/predict" "$REQ1" | _jq
REQ2='{"age":58,"sex":0,"cp":2,"trestbps":120,"chol":220,"fbs":0,"restecg":1,"thalach":160,"exang":0,"oldpeak":0.5,"slope":1,"ca":0,"thal":2}'
post_json "$WEB/api/predict" "$REQ2" | _jq
ok "Predict OK"

# --- what-if ------------------------------------------------------------------
bold "4) What-If"
WHATIF='{
  "base":{"age":54,"sex":1,"cp":0,"trestbps":130,"chol":246,"fbs":0,"restecg":0,"thalach":150,"exang":0,"oldpeak":1,"slope":2,"ca":0,"thal":2},
  "tweaked":{"age":54,"sex":1,"cp":1,"trestbps":120,"chol":200,"fbs":0,"restecg":0,"thalach":165,"exang":0,"oldpeak":0.2,"slope":1,"ca":0,"thal":2}
}'
post_json "$WEB/api/whatif" "$WHATIF" | _jq
ok "What-If OK"

# --- cohort explorer ----------------------------------------------------------
bold "5) Cohort Explorer"
COHORT='{"sex":1,"age_min":40,"age_max":65,"cp":[0,1,2]}'
post_json "$WEB/api/cohorts/explore" "$COHORT" | _jq
ok "Cohort explorer OK"

# --- global shap --------------------------------------------------------------
bold "6) Global SHAP"
curl -s "$WEB/api/shap/global" | _jq
ok "Global SHAP OK"

# --- sessions (should have at least 1 now) -----------------------------------
bold "7) Sessions"
curl -s "$API/sessions" | _jq
curl -s "$WEB/api/sessions" | _jq
ok "Sessions OK"

# --- batch upload -------------------------------------------------------------
bold "8) Batch scoring (CSV)"
if [ ! -f "$SAMPLE_CSV" ]; then
  cat > "$SAMPLE_CSV" <<'CSV'
age,sex,cp,trestbps,chol,fbs,restecg,thalach,exang,oldpeak,slope,ca,thal
54,1,0,130,246,0,0,150,0,1.0,2,0,2
62,0,1,120,220,0,1,160,0,0.5,1,0,2
CSV
  ok "Created $SAMPLE_CSV"
fi
curl -s -F "file=@${SAMPLE_CSV}" "$WEB/api/batch/upload" | _jq
ok "Batch upload OK"

# --- PDF report (timestamped) -------------------------------------------------
bold "9) PDF report"
curl -fL --output "$REPORT_OUT" "$WEB/api/report.pdf"
ls -l "$REPORT_OUT"
ok "Report saved → $REPORT_OUT"

bold "✅ All smoke checks passed."
echo "Open UI → $WEB"
