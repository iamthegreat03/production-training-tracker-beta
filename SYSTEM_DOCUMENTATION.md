# Production Training Tracker — System Documentation

**Version:** 3.9
**Stack:** React 19 · Vite · TypeScript · Supabase (PostgreSQL + Auth) · Tailwind CSS · Framer Motion
**Deployment:** Netlify (static PWA)
**Last Updated:** May 2026

---

## 1. What Is This System?

**Production Training Tracker (PT Tracker)** is an internal Progressive Web App built for the RWDS (Real World Design Studio) design team to manage, track, and analyze designer training programs. It replaces manual spreadsheet tracking with a real-time, database-driven system accessible from any device — including installation as a home screen app on iOS and Android.

The system handles the full lifecycle of a training program: creation and enrollment, attendance tracking with multiple layout views, output progress notes, skill assessment, and team analytics.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | React 19 + Vite |
| Language | TypeScript |
| Styling | Tailwind CSS + CSS custom properties |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email/password) |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | Sonner (toast) |
| PWA | Vite PWA plugin (service worker + manifest) |

---

## 3. Project Structure

```
app/
  src/
    context/
      AppContext.tsx        # Global state via useReducer + Supabase client
    pages/
      Login.tsx            # Auth form
      Dashboard.tsx        # Staff overview tab
      Designers.tsx        # Designer roster management
      Trainings.tsx        # Training management (kanban + table views)
      Attendance.tsx       # Attendance tracking (4 layout views)
      Teams.tsx            # Team management + reshuffle
      SkillSet.tsx         # Platform skill matrix
      UserManagement.tsx   # Account management
      DesignerHome.tsx     # Designer personal dashboard
    components/
      attendance/
        AttendanceCard.tsx  # Per-designer card with heatmap
        MatrixView.tsx      # Grid view (designers × sessions)
        RosterView.tsx      # Compact table with inline mark buttons
        StatsView.tsx       # Charts and rankings
      trainings/
        TrainingDetail.tsx  # Training detail modal/panel
      designers/
        DesignerProfile.tsx # Designer profile modal with heatmaps
    types/
      database.ts          # All TypeScript types for DB tables
    lib/
      utils.ts             # Shared helpers: cn, initials, normAtt, pct, fmtDs
      supabase.ts          # Supabase client singleton
```

---

## 4. State Management

Global state lives in `AppContext` using `useReducer`. The state shape:

```ts
interface AppState {
  user: User | null
  role: string | null
  designer: Designer | null
  perms: Permissions
  page: string
  loading: boolean
  designers: Designer[]
  teams: Team[]
  trainings: Training[]
  enrollments: TrainingEnrollment[]
  sessions: TrainingSession[]
  attendance: Attendance[]
  skillGaps: SkillGap[]
  makeups: MakeupSession[]
  designerSkills: DesignerSkill[]
  users: UserRole[]
  makeupRequests: MakeupRequest[]
}
```

Actions: `SET_AUTH`, `SET_DATA`, `SET_LOADING`, `SET_PAGE`, `SIGN_OUT`

`loadAll()` fetches all data tables from Supabase in parallel and dispatches `SET_DATA`.

### Auth Flow

Initial load uses `getSession()` (imperative, not event-driven) to prevent stale token issues and iOS PWA hangs:

```ts
supabase.auth.getSession().then(({ data: { session } }) => {
  if (session?.user) applySession(session)
  else dispatch({ type: 'SIGN_OUT' })
})

supabase.auth.onAuthStateChange((event, session) => {
  if (event === 'SIGNED_IN') applySession(session!)
  else if (event === 'SIGNED_OUT') dispatch({ type: 'SIGN_OUT' })
  // INITIAL_SESSION and TOKEN_REFRESHED are intentionally ignored
})
```

---

## 5. User Roles

| Role | Access |
|---|---|
| `admin` / `trainer` | Full access to all tabs and actions |
| `staff` | Configurable via `permissions` jsonb in `user_roles` |
| `designer` | Personal dashboard only (DesignerHome) |

Permission checks use the `can(key: string)` helper from context.

---

## 6. Navigation

### Staff Navigation
| Tab | Component | Route Key |
|---|---|---|
| Dashboard | `Dashboard.tsx` | `dashboard` |
| Designers | `Designers.tsx` | `designers` |
| Trainings | `Trainings.tsx` | `trainings` |
| Attendance | `Attendance.tsx` | `attendance` |
| Teams | `Teams.tsx` | `teams` |
| Skill Set | `SkillSet.tsx` | `skillset` |
| User Mgmt | `UserManagement.tsx` | `users` |

### Designer Navigation
| Tab | Component | Route Key |
|---|---|---|
| Home | `DesignerHome.tsx` | `home` |

---

## 7. Features

### 7.1 Training Management (`Trainings.tsx`)

Two training types:

**Hands-On** — Recurring platform skills training. Sessions auto-generated from a day schedule between start and target dates. Designers awarded a skill level on completion.

**Discussion** — Knowledge-sharing sessions with specific exact dates. Records designer participation in the Skill Gap section on completion.

#### Layout Views
- **Kanban** — 4 columns: Upcoming, Active, On Hold, Completed. Cards draggable between columns via HTML5 Drag and Drop API. Columns highlight orange on drag-over.
- **Table** — Sortable table with columns: Name, Type, Status, Focus, Timeline, Enrolled, Actions. Click any column header to sort ascending/descending.

#### Training Status
`'upcoming' | 'active' | 'on-hold' | 'completed'`

> ⚠️ The Supabase CHECK constraint must be migrated to include `'on-hold'`. See database schema doc.

#### Finish & Assess
The "Finish & Assess" button on a training detail panel:
- Visible only to users with `canAddEditTrainings` permission
- Only shown when `status !== 'completed'`
- On click: confirms → updates `trainings.status = 'completed'` in Supabase → dispatches data reload

---

### 7.2 Attendance Tracking (`Attendance.tsx`)

Select a training chip → select a session chip → mark attendance.

#### Layout Views (toggle in header)
- **Cards** — original card grid; each card shows designer name, heatmap dots, attendance rate, mark buttons (Present/Late/Absent), notes button, undo button
- **Matrix** — spreadsheet grid; rows = enrolled designers, columns = all sessions; click a cell to cycle: `null → present → late → absent → null`; unscheduled cells shown as muted gray
- **Roster** — compact table; inline Present/Late/Absent buttons per row; color-coded left border (green/amber/red); notes snippet shown under name
- **Stats** — 4 summary cards (Sessions, Avg Rate, Best Session, At Risk); bar chart showing attendance rate per session (green ≥80%, amber ≥60%, red <60%); designer rankings table with present/late/absent counts and progress bars

#### Heatmap Dot System
Three-tier opacity system:
- `bg-slate-400/[0.06]` — unscheduled (not on this designer's schedule)
- `bg-slate-400/40` — scheduled but unmarked
- Solid green / amber / red — present / late / absent

#### Output Notes
Each designer has a notes button that opens a modal textarea for recording their individual output and progress. Notes are stored in `attendance.notes` per session. Button turns orange when notes exist.

#### Session Topic (Discussion trainings)
An editable topic field appears per session for Discussion trainings. Click the pencil icon to edit inline. Stored in `training_sessions.notes`.

#### Attendance Value Types
```ts
type AttendanceValue = 'true' | 'false' | 'late' | null
```
`normAtt()` utility normalizes DB values (Supabase may return booleans as strings).

#### Optimistic Updates
`optimistic: Record<string, AttendanceValue>` keyed by `{sessionId}_{designerId}`. UI updates immediately; DB write happens in background. Errors roll back the optimistic state.

---

### 7.3 Designer Roster (`Designers.tsx`)

Searchable, sortable table. Features:
- Live search by name, email, or team
- Team filter
- Sort by any column
- Bulk mode: select multiple → bulk enroll, bulk transfer, bulk delete
- Edit modal: name, team, rank, email, notes
- Designer Profile modal: overall rate, per-training heatmaps, skill set, notes

#### Heatmap in Profile
`DesignerProfile.tsx` renders per-training heatmaps using the same three-tier dot system:
- Computes `scheduledIds` per training using `enrollment.designer_schedule`
- Dots show: unscheduled (6% gray), scheduled/unmarked (40% gray), colored (marked)

---

### 7.4 Teams (`Teams.tsx`)

4-column grid showing team stats and member lists.

- **Reshuffle mode** — drag-style reassignment; click a designer to move to another team; preview changes before saving
- Add/delete teams
- Full roster modal per team

---

### 7.5 Skill Set (`SkillSet.tsx`)

**Platform Expertise Matrix** — designers (rows) × platforms (columns). Each cell shows level (INT/ADV/EXP) or —. Click to edit.

**Designer Skill Gap** — shows completed Discussion trainings as columns. Designers marked ✓ / — per discussion.

**Team Skill Coverage** — % of team members with any skill per platform.

---

### 7.6 User Management (`UserManagement.tsx`)

- Create staff accounts (trainer/manager) not linked to a designer
- Link designer profiles to auth accounts
- Per-manager permissions toggles (11 switches)
- Remove user role records

---

### 7.7 Dashboard (`Dashboard.tsx`)

- Overall attendance rate (hero metric)
- Critical alerts: consecutive absences, overdue make-ups
- Stats row: designer count, active trainings, total sessions, overall rate
- Upcoming sessions (next 7 days)
- Top performers (this month)
- Team breakdown with progress bars
- Trainings ending soon (next 14 days)
- Skill coverage per platform

---

## 8. Theme System

Light/dark mode toggled by adding/removing the `dark` class on `<html>`. Preference stored in `localStorage('pt-theme')`.

All colors use CSS custom properties in `index.css`:
```css
:root { --surface: ...; --primary: ...; --accent: ...; }
.dark { --surface: ...; --primary: ...; --accent: ...; }
```

`.glass` class: solid background in light mode, blur/translucency in dark mode.

Orange accent color: `rgb(249 115 22)` (Tailwind `orange-500`).

---

## 9. PWA / iOS Notes

- Vite PWA plugin generates service worker and web manifest
- `getSession()` used for initial auth to prevent the iOS PWA infinite hang (stale token in localStorage blocks `onAuthStateChange`)
- Input font sizes ≥16px to prevent iOS zoom on focus
- Drag-to-scroll on session date chips uses `useRef` + `onMouseDown/Move/Up` for desktop compatibility
- Bottom navigation bar appears on mobile screens (≤640px)

---

## 10. Supabase Setup

- **Auth:** Email/password. Disable email confirmation in Supabase Auth settings for instant activation.
- **RLS:** Row Level Security should be configured per table per role.
- **Anon key:** Public anon key used in client — safe because RLS enforces access.
- **Real-time:** Not currently used; all data loaded on `loadAll()` call.

---

## 11. Key Utility Functions (`lib/utils.ts`)

| Function | Description |
|---|---|
| `cn(...classes)` | Tailwind class merging (clsx + tailwind-merge) |
| `initials(name)` | Two-character initials from full name |
| `normAtt(val)` | Normalizes DB attendance value to `'true' / 'false' / 'late' / null` |
| `pct(numerator, denominator)` | Safe percentage — returns 0 if denominator is 0 |
| `fmtDs(dateStr)` | Short date format: `"Jan 15"` (adds `T00:00:00` to prevent UTC offset shift) |

---

*Production Training Tracker v3.0 — RWDS Design Team — May 2026*
