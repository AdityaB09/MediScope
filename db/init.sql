CREATE TABLE IF NOT EXISTS sessions (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT NOT NULL,
  patient_json JSONB NOT NULL,
  risk_label TEXT NOT NULL,
  risk_score DOUBLE PRECISION NOT NULL,
  shap JSONB NOT NULL
);

CREATE TABLE IF NOT EXISTS batch_runs (
  id UUID PRIMARY KEY,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  model_version TEXT NOT NULL,
  input_cols TEXT[] NOT NULL,
  row_count INT NOT NULL,
  s3_url TEXT
);

CREATE INDEX IF NOT EXISTS idx_sessions_created_at ON sessions (created_at DESC);
