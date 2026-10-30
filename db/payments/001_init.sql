CREATE TABLE IF NOT EXISTS payment_attempts (
  id UUID PRIMARY KEY,
  reservation_id UUID NOT NULL,
  scenario TEXT NOT NULL CHECK (scenario IN ('success', 'failure', 'slow')),
  status TEXT NOT NULL CHECK (status IN ('PENDING', 'SUCCEEDED', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS payment_attempts_reservation_idx ON payment_attempts (reservation_id, created_at);
