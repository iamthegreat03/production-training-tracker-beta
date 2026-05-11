# Changelog — Production Training Tracker

All notable changes to this project are documented here.

---

## [v3.0] — 2026-05-12 (React/Vite Rewrite + Feature Expansion)

### Architecture Rewrite
- Migrated from vanilla JS single-file HTML to React 19 + Vite + TypeScript PWA
- State management via `useReducer` with global `AppContext`
- Supabase client with Row Level Security (RLS), real-time data loading
- Tailwind CSS + CSS variables for full light/dark theme support
- Framer Motion for animated layout transitions
- Deployed as PWA with manifest, service worker, and iOS home screen support

### New Features

#### Attendance Tab
- **4 layout views** — toggle between Cards, Matrix, Roster, and Stats
  - **Cards** — original per-designer card grid with attendance heatmap dots
  - **Matrix** — spreadsheet-style grid; rows = designers, columns = sessions; click any cell to cycle status
  - **Roster** — compact table with inline Present / Late / Absent buttons; color-coded left border per status
  - **Stats** — summary dashboard with 4 metric cards, bar chart (attendance rate per session), and designer rankings table with present/late/absent breakdown and progress bars
- **Output notes modal** — each designer in Cards/Roster view has a notes button (orange when notes exist) that opens a modal for tracking individual progress and output
- **Session topic field** — for Discussion trainings, an editable topic/notes field appears per session (inline edit with pencil icon)
- **Mouse drag-to-scroll** on session date chips on desktop (previously mobile-only)
- **Heatmap dot system** — three-tier visual: 6% opacity gray (unscheduled), 40% opacity gray (scheduled/unmarked), colored (marked: green/amber/red)

#### Trainings Tab
- **Table layout** — sortable table view alongside the kanban board; columns: Name, Type, Status, Focus, Timeline, Enrolled, Actions; click column headers to sort
- **On Hold kanban column** — new column for paused trainings
- **Draggable kanban cards** — HTML5 drag-and-drop between status columns; column highlights orange on drag-over; empty columns show "Drop here"
- **Finish & Assess button** — now fully wired; confirms then marks training as completed in Supabase; visible only to admins when training is not yet completed

#### General
- **Dark mode toggle** persisted in localStorage
- **Glassmorphism** — solid background in light mode, blur effect only in dark mode
- **Role-based navigation** — Trainer/Manager see full staff tabs; Designers see personal dashboard only

### Bug Fixes
- **Stuck loading on reload** — root cause was stale Supabase token in localStorage. Fixed by switching from `onAuthStateChange`-only to `getSession()` for initial auth check, with `onAuthStateChange` only handling live `SIGNED_IN`/`SIGNED_OUT` events
- **"Save changes" button text not centered** — added `justify-center` to the `.btn` CSS class
- **Heatmap dots invisible in dark mode** — `bg-border` was nearly black in dark mode; replaced with explicit opacity-based grays
- **DB constraint error for "on-hold" status** — `trainings_status_check` did not include `on-hold`; requires the following migration:
  ```sql
  ALTER TABLE trainings DROP CONSTRAINT trainings_status_check;
  ALTER TABLE trainings ADD CONSTRAINT trainings_status_check
    CHECK (status IN ('upcoming', 'active', 'on-hold', 'completed'));
  ```
- **Completed kanban column cut off** — removed `max-w-7xl` constraint from kanban wrapper so all 4 columns render without clipping
- **Non-functional history/message buttons** on attendance cards — removed history button; replaced message button with functional output notes modal
- **History/message buttons overlapping rate %** on card hover — layout corrected; notes button is now beside the rate badge, not overlapping

---

## [v2.0] — 2025 (Vanilla JS — Deprecated)

Original single-file HTML implementation. Replaced by v3.0 React/Vite rewrite.

Features included: training creation, attendance tracking, skill set matrix, team management, user management, designer portal, make-up sessions, schedule conflict detection, bulk operations.

---

*Production Training Tracker — RWDS Design Team*
