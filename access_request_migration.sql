-- Access Request system
-- Run this in Supabase SQL Editor

CREATE TABLE access_requests (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  email          text NOT NULL,
  requested_role text NOT NULL DEFAULT 'designer',
  message        text,
  status         text NOT NULL DEFAULT 'pending'
                   CHECK (status IN ('pending', 'approved', 'rejected')),
  reviewed_at    timestamptz,
  created_at     timestamptz DEFAULT now()
);

ALTER TABLE access_requests ENABLE ROW LEVEL SECURITY;

-- Anyone (including non-logged-in users) can submit a request
CREATE POLICY "public_insert_access_requests"
  ON access_requests FOR INSERT TO anon WITH CHECK (true);

-- Authenticated users (admins/trainers) can read and update requests
CREATE POLICY "auth_read_access_requests"
  ON access_requests FOR SELECT TO authenticated USING (true);

CREATE POLICY "auth_update_access_requests"
  ON access_requests FOR UPDATE TO authenticated USING (true);
