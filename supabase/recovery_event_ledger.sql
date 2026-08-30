-- ==============================================================================
-- P0 TASK 2: INDEPENDENT RECOVERY EVENT LEDGER TABLE
-- KoparNiti (कोपरनीती) - Autonomous Disaster Recovery Append-Only Ledger
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.recovery_event_ledger (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    event_id TEXT UNIQUE NOT NULL,
    sequence_no BIGINT NOT NULL UNIQUE,
    issue_id TEXT NOT NULL,
    operation_id TEXT,
    event_type TEXT NOT NULL,
    payload JSONB NOT NULL DEFAULT '{}'::jsonb,
    payload_hash TEXT NOT NULL,
    previous_hash TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    actor_id TEXT NOT NULL DEFAULT 'system_engine',
    operation_status TEXT NOT NULL DEFAULT 'COMMITTED',
    schema_version INT NOT NULL DEFAULT 1,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Indices for fast sequence verification and issue audit trail queries
CREATE INDEX IF NOT EXISTS idx_recovery_ledger_seq ON public.recovery_event_ledger (sequence_no ASC);
CREATE INDEX IF NOT EXISTS idx_recovery_ledger_issue ON public.recovery_event_ledger (issue_id);
CREATE INDEX IF NOT EXISTS idx_recovery_ledger_op ON public.recovery_event_ledger (operation_id);
CREATE INDEX IF NOT EXISTS idx_recovery_ledger_type ON public.recovery_event_ledger (event_type);

-- Row Level Security (RLS)
ALTER TABLE public.recovery_event_ledger ENABLE ROW LEVEL SECURITY;

-- Allow read access to all users for public auditability & citizen transparency
DROP POLICY IF EXISTS "Public read recovery ledger" ON public.recovery_event_ledger;
CREATE POLICY "Public read recovery ledger"
    ON public.recovery_event_ledger FOR SELECT
    USING (true);

-- Allow insert access for logging events
DROP POLICY IF EXISTS "Insert recovery ledger" ON public.recovery_event_ledger;
CREATE POLICY "Insert recovery ledger"
    ON public.recovery_event_ledger FOR INSERT
    WITH CHECK (true);
