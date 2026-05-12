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

## [v3.1] — 2026-05-12

### Bug Fixes
- **Drag causes page reload in Trainings tab** — missing `e.preventDefault()` on `onDrop`; fixed. Secondary cause was `loadAll()` triggering a loading flash; resolved with optimistic dispatch + revert-on-error pattern (no page reload at all)
- **Session date chips unclickable after drag-scroll** — `stopPropagation` on chip `mouseDown` was permanently breaking the drag-state reset chain; removed
- **New training not generating sessions** — `handleSave` had a placeholder comment instead of actual session generation logic; added full date-walk for Hands-On and direct-date iteration for Discussion trainings, with duplicate-date prevention
- **Skill set column delete button non-functional** — column trash button for dynamic (non-base) platforms had no `onClick`; wired up `deletePlatform()` which deletes all `designer_skills` rows for that platform and reloads state

### Features
- **Reschedule within the week** — absent designers can be rescheduled to any other day in the same session week via a makeup date picker; records saved to `makeup_sessions` table
- **Overdue banner** — if a session's week has ended and designers still have no attendance mark, an amber alert banner appears with a "Mark all absent" bulk action
- **Finish & Assess** — "Finish & Assess" button is now visible only when training status is `completed`; on confirm, awards skill set automatically to all designers with at least one present/late attendance record; avoids downgrades (skips designers already at an equal or higher level)
- **Platform type toggle in training modal** — dropdown to select an existing platform or a free-text input to add a new one
- **Enrollment graying** — designers already at the target skill level or higher are grayed out and disabled during enrollment, with an "Already {level}" badge
- **Auto skill award on assessment** — Hands-On trainings award `training.platform` at `training.skill_level`; Discussion trainings award `DSG: {training.name}` at `Completed`; source note is set to the training name

### Animation Overhaul
- Standardized all modal entry/exit to **spring physics** (`damping: 22, stiffness: 280, mass: 0.8`) — consistent across TrainingModal, TrainingDetail, SkillEditModal, UserModal, AddSessionModal, DesignerProfile, DesignerModal, and inline Attendance modals
- **Page transitions** updated to spring (`damping: 32, stiffness: 380`) for snappier feel with no tween delay
- **View/tab switches** in Trainings, Attendance, and TrainingDetail now include a subtle `y: ±4px` slide alongside opacity for spatial orientation
- **Stagger lists** (cards, table rows, badges) now use spring physics with capped delay (`Math.min(i * 0.04, 0.28s)`) to prevent long lists from feeling slow
- **CSS transitions** overhauled — all `.btn`, `.card`, `.input`, `.nav-item`, `.chip` now use `cubic-bezier(0.16, 1, 0.3, 1)` (expo-out) for a snappy yet smooth feel
- Added `:active` press-down scale (`scale(0.97)`) to primary, ghost, and outline buttons, plus chips
- `.card-interactive` now uses `will-change: transform` and a slightly stronger hover lift

---

## [v3.3] — 2026-05-12

### Features
- **Assess designers one by one** — "Finish & Assess" now opens a dedicated assess panel inside the Training Detail modal instead of bulk-awarding everyone automatically. Each enrolled designer is listed with a checkbox (pre-checked if they attended), their attendance count/rate, and any existing skill level for that platform. "Select Attendees" shortcut pre-selects all who attended; individual toggles let you include or exclude anyone. "Award to N Designers" confirms and runs the skill grant only for the selected subset.
- **Weekly Trained Designers card** — new card on the Dashboard showing unique designer counts per calendar week (Mon–Sun) as a mini bar chart, up to the last 8 weeks.

### Bug Fixes
- **Skill Set layout** — Team Skill Coverage, Discussion History, and Global Skill Distribution cards moved to the top of the page (above the matrix table) so summary stats are visible without scrolling.
- **Distribution cards not updating** — distribution useMemo now tracks `allPlatforms` (base + dynamic) instead of only `BASE_PLATFORMS`, so newly assessed dynamic platforms immediately appear; `allPlatforms` is also properly memoized so dependency tracking is accurate.

---

## [v3.5] — 2026-05-12

### Features
- **Output Checklist on Trainings** — Hands-On trainings can now define a list of pass/fail output criteria when creating or editing the training (Step 1 → Output Checklist section). Items are saved as a `checklist` array on the training record.
- **Output scoring in Assess panel** — Each designer card in the assess panel now shows:
  - A URL input to paste and view their submitted output link
  - Checklist items as toggleable pass/fail chips
  - Auto-calculated scores: Attendance (40%) + Output (60%) = Final Score (%)
  - Color-coded score badge (green ≥80, amber ≥60, red <60)
- **Assessment data persisted** — On confirm, each selected enrollment record saves `output_url`, `checklist_results`, `output_score`, `attendance_score`, and `final_score` to Supabase

### Database Migration Required
Run the following in Supabase SQL editor:
```sql
ALTER TABLE trainings ADD COLUMN IF NOT EXISTS checklist TEXT[] DEFAULT '{}';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS output_url TEXT;
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS checklist_results JSONB DEFAULT '[]';
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS output_score NUMERIC(5,2);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS attendance_score NUMERIC(5,2);
ALTER TABLE training_enrollments ADD COLUMN IF NOT EXISTS final_score NUMERIC(5,2);
```

---

## [v3.4] — 2026-05-12

### Mobile Responsiveness

- **Attendance stats grid** — `grid-cols-4` → `grid-cols-2 sm:grid-cols-4`; Present/Late/Absent/Unmarked now 2×2 on small screens
- **Attendance filter bar** — search width `w-36` → `w-28 sm:w-36`; divider between search and bulk action buttons hidden on mobile; outer flex now wraps
- **Training modal grids** — Platform+Level grid `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`; Date+Status grid `grid-cols-3` → `grid-cols-1 sm:grid-cols-3`
- **Skill Set controls** — matrix filter row now `flex-wrap` and `min-w-0` so chips wrap instead of overflowing; sticky designer column narrowed on mobile (`min-w-[140px] sm:min-w-[200px]`, `w-40 sm:w-64`)
- **Skill Set team coverage** — `grid-cols-5` → `grid-cols-3 sm:grid-cols-5`
- **Roster view mark buttons** — "Present", "Late", "Absent" text labels hidden on mobile (`hidden sm:inline`), icons-only on small screens
- **Training Detail banner** — `h-32` → `h-24 sm:h-32`; footer now `flex-wrap` with `gap-2`; "Attendance" and "Assess" button text truncated on mobile
- **Training Detail roster info** — `grid-cols-2` → `grid-cols-1 sm:grid-cols-2`
- **Matrix view** — sticky designer column `min-w-[180px]` → `min-w-[140px] sm:min-w-[180px]`; session cells `min-w-[56px]` → `min-w-[44px] sm:min-w-[56px]`
- **Designers search** — `min-w-48` → `min-w-32 sm:min-w-48`

---

## [v3.2] — 2026-05-12

### Bug Fixes
- **White borders in dark mode** — Tailwind's default border color (`#e5e7eb`) was leaking through in dark mode on buttons, cards, and other bordered elements. Fixed with a three-layer approach:
  1. `borderColor.DEFAULT` in Tailwind config overrides the preflight default to `rgb(var(--border))`
  2. `border` and `border-subtle` registered as named color tokens so `border-border` resolves to the CSS variable
  3. `.dark *` base CSS rule as a guaranteed fallback — stays below `@layer utilities` so explicit colored borders (e.g., `border-emerald-400`) are unaffected

---

## [v2.0] — 2025 (Vanilla JS — Deprecated)

Original single-file HTML implementation. Replaced by v3.0 React/Vite rewrite.

Features included: training creation, attendance tracking, skill set matrix, team management, user management, designer portal, make-up sessions, schedule conflict detection, bulk operations.

---

*Production Training Tracker — RWDS Design Team*
