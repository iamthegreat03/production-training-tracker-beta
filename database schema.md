# Database Schema — Production Training Tracker

**Database:** Supabase (PostgreSQL)
**Last Updated:** May 2026 (v3.18)

---

## Table `attendance`

Tracks each designer's status per training session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `session_id` | `uuid` | Nullable, FK → `training_sessions.id` | Which session |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | Which designer |
| `is_present` | `text` | Nullable | `'true'` / `'false'` / `'late'` / `null` (unmarked) |
| `notes` | `text` | Nullable | Output notes for this designer on this session (used to track individual progress) |
| `marked_at` | `timestamptz` | Nullable | When the attendance was last marked |

---

## Table `designer_skills`

Tracks platform skill levels awarded through training completions or manually.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | Owner designer |
| `platform` | `text` | | Platform name (e.g. `'Shopify'`) or `'DSG: {training name}'` for discussion completions |
| `level` | `text` | | `'Intermediate'` / `'Advanced'` / `'Expert'` / `'Completed'` (Discussion) |
| `source` | `text` | Nullable | Training name or `'manual'` |
| `updated_at` | `timestamptz` | Nullable | Last updated |

> **DSG records:** Discussion training completions are stored with `platform = 'DSG: {training name}'` and `level = 'Completed'`. The unique constraint `(designer_id, platform)` ensures each designer is recorded once per topic.

---

## Table `designers`

The designer roster.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `name` | `text` | | Full name |
| `email` | `text` | Nullable, Unique | Email address |
| `team` | `text` | Nullable | Team name (`null` = Uncategorized) |
| `rank` | `text` | | Tier 1 / Tier 2 / Tier 3 |
| `platform` | `text` | Nullable | Primary platform |
| `auth_user_id` | `uuid` | Nullable | Linked Supabase Auth user (if account exists) |
| `notes` | `text` | Nullable | General notes |
| `created_at` | `timestamptz` | Nullable | Auto |
| `updated_at` | `timestamptz` | Nullable | Auto |

---

## Table `makeup_requests`

Designer requests to reschedule a missed session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | |
| `session_id` | `uuid` | Nullable, FK → `training_sessions.id` | Original session missed |
| `training_id` | `uuid` | Nullable, FK → `trainings.id` | |
| `proposed_date` | `date` | | Proposed make-up date |
| `proposed_day` | `text` | Nullable | Day of week |
| `reason` | `text` | Nullable | Reason for absence |
| `status` | `text` | Nullable | `'pending'` / `'approved'` / `'rejected'` |
| `trainer_note` | `text` | Nullable | Trainer's response note |
| `created_at` | `timestamptz` | Nullable | Auto |

---

## Table `makeup_sessions`

Scheduled make-up sessions for designers who missed a session.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `original_session_id` | `uuid` | Nullable, FK → `training_sessions.id` | Session that was missed |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | |
| `training_id` | `uuid` | Nullable, FK → `trainings.id` | |
| `makeup_date` | `date` | | Date of make-up session |
| `day_of_week` | `text` | Nullable | Day name |
| `is_attended` | `bool` | Nullable | `null` = pending, `true` = attended, `false` = missed |
| `notes` | `text` | Nullable | |
| `proof_url` | `text` | Nullable | Link to proof/recording |
| `created_at` | `timestamptz` | Nullable | Auto |

---

## Table `skill_gaps`

Legacy table — retained for historical data, no longer actively written.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | |
| `designer_id` | `uuid` | Nullable | |
| `training_type` | `text` | | |
| `skill_name` | `text` | | |
| `is_completed` | `bool` | Nullable | |
| `updated_at` | `timestamptz` | Nullable | |

> Skill gap data is now stored in `designer_skills` with the `DSG:` prefix.

---

## Table `teams`

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `name` | `text` | Unique | Team name |
| `created_at` | `timestamptz` | Nullable | Auto |

---

## Table `training_enrollments`

Maps designers to trainings with their assigned schedule subset.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `training_id` | `uuid` | Nullable, FK → `trainings.id` | |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | |
| `enrolled_at` | `timestamptz` | Nullable | When enrolled |
| `designer_schedule` | `text[]` | Nullable | Days (Hands-On) or dates (Discussion) assigned to this designer; empty = all sessions |

---

## Table `training_sessions`

Individual sessions within a training program.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `training_id` | `uuid` | Nullable, FK → `trainings.id` | |
| `session_date` | `date` | | Exact date |
| `day_of_week` | `text` | Nullable | Day name (auto-derived) |
| `notes` | `text` | Nullable | Session topic/notes — used in Discussion trainings to record the topic covered per session |
| `proof_url` | `text` | Nullable | Link to proof/recording |
| `created_at` | `timestamptz` | Nullable | Auto |

---

## Table `trainings`

Training programs.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `name` | `text` | | Training program name |
| `type` | `text` | | `'Hands-On'` or `'Discussion'` |
| `platform` | `text` | Nullable | Platform name (Hands-On only) |
| `start_date` | `date` | Nullable | First session date |
| `target_date` | `date` | Nullable | Target completion date |
| `schedule` | `text[]` | Nullable | Day names (Hands-On) or exact dates (Discussion) |
| `status` | `text` | CHECK constraint | `'upcoming'` / `'active'` / `'on-hold'` / `'completed'` |
| `skill_name` | `text` | Nullable | Platform/skill awarded on completion (Hands-On) |
| `skill_level` | `text` | Nullable | `'Intermediate'` / `'Advanced'` / `'Expert'` |
| `conflict_note` | `text` | Nullable | Reason override when a schedule conflict was accepted |
| `topic` | `text` | Nullable | Topic or agenda (Discussion) |
| `facilitator` | `text` | Nullable | Who leads the session (Discussion) |
| `resources_url` | `text` | Nullable | Link to materials (Discussion) |
| `notes` | `text` | Nullable | General training notes |
| `created_at` | `timestamptz` | Nullable | Auto |
| `updated_at` | `timestamptz` | Nullable | Auto |

> **Status constraint migration** — the original CHECK constraint only allowed `upcoming / active / completed`. After adding the On Hold feature, the constraint must be updated:
> ```sql
> ALTER TABLE trainings DROP CONSTRAINT trainings_status_check;
> ALTER TABLE trainings ADD CONSTRAINT trainings_status_check
>   CHECK (status IN ('upcoming', 'active', 'on-hold', 'completed'));
> ```

---

## Table `user_roles`

Maps Supabase Auth users to app roles and permissions.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `auth_user_id` | `uuid` | Unique, FK → `auth.users.id` | Supabase Auth UID |
| `role` | `text` | | `'admin'` / `'trainer'` / `'staff'` / `'designer'` |
| `designer_id` | `uuid` | Nullable, FK → `designers.id` | Linked designer profile (designer role only) |
| `permissions` | `jsonb` | Nullable | Per-user permission overrides (staff/manager role) |
| `created_at` | `timestamptz` | Nullable | Auto |

### Permissions JSONB shape
```json
{
  "canAddDesigners": true,
  "canDeleteDesigners": false,
  "canAddEditTrainings": true,
  "canDeleteTrainings": false,
  "canMarkAttendance": true,
  "canAddSessions": true,
  "canManageUsers": false,
  "hideTeamsTab": false,
  "hideSkillSetTab": false,
  "hideAttendanceTab": false,
  "hideDesignersTab": false
}
```

---

---

## Table `ext_trainings`

Cross-department training programs — product knowledge sessions delivered to other departments (Sales, Marketing, Compliance, etc.).

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `title` | `text` | NOT NULL | Program/topic title |
| `department` | `text` | NOT NULL | Department receiving the training (e.g. `'Sales'`, `'Marketing'`) |
| `topic` | `text` | Nullable | Specific subject matter |
| `requested_by` | `text` | Nullable | Name of the person who requested the training |
| `facilitator` | `text` | Nullable | RWDS member facilitating the session |
| `status` | `text` | NOT NULL, CHECK | `'requested'` / `'scheduled'` / `'completed'` / `'cancelled'`. Default `'requested'` |
| `notes` | `text` | Nullable | General notes |
| `created_at` | `timestamptz` | Nullable | Auto |

**RLS:** `auth_all_ext_trainings` — authenticated users have full read/write access.

---

## Table `ext_sessions`

Individual session logs within a cross-department training program.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `training_id` | `uuid` | NOT NULL, FK → `ext_trainings.id` ON DELETE CASCADE | Parent program |
| `session_date` | `date` | NOT NULL | Date the session was held |
| `attendee_count` | `int` | NOT NULL, Default `0` | Number of department staff who attended |
| `notes` | `text` | Nullable | What was discussed / session topic |
| `proof_url` | `text` | Nullable | Link to recording or proof |
| `created_at` | `timestamptz` | Nullable | Auto |

> Deleting a program (`ext_trainings`) cascades and removes all its sessions automatically.

**RLS:** `auth_all_ext_sessions` — authenticated users have full read/write access.

---

## Table `access_requests`

Pending account requests submitted from the login page by new users.

| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| `id` | `uuid` | Primary Key | Auto-generated |
| `name` | `text` | NOT NULL | Requester's full name |
| `email` | `text` | NOT NULL | Requester's email |
| `requested_role` | `text` | NOT NULL, Default `'designer'` | Requested role: `'designer'` / `'staff'` / `'trainer'` |
| `message` | `text` | Nullable | Optional note to admin |
| `status` | `text` | NOT NULL, CHECK | `'pending'` / `'approved'` / `'rejected'`. Default `'pending'` |
| `reviewed_at` | `timestamptz` | Nullable | When admin approved/rejected |
| `created_at` | `timestamptz` | Nullable | Auto |

**Unique constraint:** `UNIQUE INDEX ON access_requests (lower(email)) WHERE status = 'pending'` — prevents duplicate pending requests for the same email.

**RLS:**
- `public_insert_access_requests` — anonymous users can INSERT (so non-logged-in requesters can submit).
- `auth_read_access_requests` — authenticated users can SELECT all requests.
- `auth_update_access_requests` — authenticated users can UPDATE (for approve/reject).

> Approved requests trigger the `approve-access` Edge Function which creates the Supabase Auth account, inserts into `user_roles`, and emails credentials via Gmail SMTP.

---

## Key Relationships

```
designers
  ├── training_enrollments (designer_id)
  ├── attendance (designer_id)
  ├── designer_skills (designer_id)
  ├── makeup_sessions (designer_id)
  └── user_roles (designer_id)

trainings
  ├── training_enrollments (training_id)
  ├── training_sessions (training_id)
  └── makeup_sessions (training_id)

training_sessions
  ├── attendance (session_id)
  └── makeup_sessions (original_session_id)

ext_trainings
  └── ext_sessions (training_id) [CASCADE DELETE]

access_requests
  └── (standalone — no FK; linked to user_roles/designers indirectly via Edge Function on approval)
```
