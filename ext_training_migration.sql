-- Cross-Department Training tables
-- Run this in Supabase SQL Editor

CREATE TABLE ext_trainings (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title         text NOT NULL,
  department    text NOT NULL,
  topic         text,
  requested_by  text,
  facilitator   text,
  status        text NOT NULL DEFAULT 'requested'
                  CHECK (status IN ('requested', 'scheduled', 'completed', 'cancelled')),
  notes         text,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE ext_sessions (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  training_id    uuid NOT NULL REFERENCES ext_trainings(id) ON DELETE CASCADE,
  session_date   date NOT NULL,
  attendee_count int  NOT NULL DEFAULT 0,
  notes          text,
  proof_url      text,
  created_at     timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE ext_trainings ENABLE ROW LEVEL SECURITY;
ALTER TABLE ext_sessions  ENABLE ROW LEVEL SECURITY;

-- Allow all authenticated users to read and write
CREATE POLICY "auth_all_ext_trainings" ON ext_trainings
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

CREATE POLICY "auth_all_ext_sessions" ON ext_sessions
  FOR ALL TO authenticated USING (true) WITH CHECK (true);
