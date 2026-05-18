# CLAUDE.md — Production Training Tracker

This file is read by Claude Code at the start of every session. It captures project context, design conventions, and working preferences so any session on any machine can resume without re-explaining the setup.

---

## Project Overview

Internal PWA for the RWDS Design Team to manage, track, and analyze designer training programs.

- **Repo root:** `training tracker beta/`
- **App root (working directory):** `training tracker beta/app/`
- **Deployed on:** Netlify (static PWA)
- **Branch:** `master` — all work goes here, push directly

---

## Stack

| Layer | Tech |
|---|---|
| Framework | React 19 + Vite + TypeScript |
| Styling | Tailwind CSS + custom CSS variables |
| Backend | Supabase (PostgreSQL + Auth + RLS) |
| Animation | Framer Motion |
| Charts | Recharts |
| Icons | Lucide React |
| Notifications | Sonner |
| PWA | vite-plugin-pwa |

---

## Repo Structure

```
training tracker beta/
├── app/                    ← npm project, working directory
│   ├── src/
│   │   ├── components/
│   │   │   ├── attendance/   AttendanceCard, MatrixView, RosterView, StatsView, AddSessionModal
│   │   │   ├── designers/    DesignerModal, DesignerProfile
│   │   │   ├── hub/          ResourceCard, ResourceModal
│   │   │   ├── layout/       AppShell, SettingsPanel
│   │   │   ├── shared/       AnimatedNumber, ConfirmModal
│   │   │   ├── skillset/     SkillEditModal
│   │   │   ├── trainings/    TrainingDetail, TrainingModal
│   │   │   └── users/        UserModal
│   │   ├── context/          AppContext.tsx (global state via useReducer)
│   │   ├── lib/              supabase.ts, utils.ts
│   │   ├── pages/            one file per tab/page
│   │   ├── types/            database.ts
│   │   ├── App.tsx           page router
│   │   ├── index.css         all CSS variables + component classes
│   │   └── main.tsx
│   ├── public/
│   └── package.json
├── CHANGELOG.md             ← always update when shipping features
├── CLAUDE.md                ← this file
├── README.md
├── database schema.md
└── SYSTEM_DOCUMENTATION.md
```

---

## Design System

### CSS Variables (index.css)

All colors and spacing use CSS custom properties on `:root` / `.dark`. The key ones:

```css
--bg, --bg-subtle          background layers
--surface, --surface-2, --surface-3   card/input surfaces
--border, --border-subtle  border colors
--text, --text-secondary, --text-muted
--orange, --orange-light   accent color (rgb values, use with rgb() or rgba())
--glass-blur               unitless number (default: 2), controlled by settings panel
```

Derived glass blur variables (auto-computed from `--glass-blur`):
```css
--glass-blur-px            cards, chips, glass elements     (× 1px)
--glass-blur-input-px      inputs                           (× 3px)
--glass-blur-strong-px     badges, warning banners          (× 4px)
--glass-blur-modal-px      modals                           (× 10px)
--glass-blur-max-px        sticky table columns             (× 12px)
```

### CSS Classes

| Class | Purpose |
|---|---|
| `.glass` | Semi-transparent card with blur (dark mode only) |
| `.modal-glass` | Stronger frosted glass for modals |
| `.card` | Standard surface card |
| `.btn-primary` | Orange gradient button |
| `.btn-outline` | Bordered button, glassy in dark |
| `.btn-ghost` | Transparent button |
| `.input` | Text input, glassy in dark |
| `.chip` | Filter chip, active state = orange |
| `.nav-item` | Sidebar nav button |
| `.badge-orange/emerald/red/amber/blue/purple` | Status badges |
| `.bg-orange-gradient` | Orange linear gradient background |
| `.page-title`, `.page-subtitle`, `.page-header` | Page heading styles |
| `.data-table` | Styled table with hover rows |

### Glassmorphism Rules

- Glass effect applies **dark mode only** (`.dark .glass`, `.dark .card`, etc.)
- Light mode uses solid surfaces — no blur
- Use `backdrop-filter: blur(var(--glass-blur-px))` (never hardcode px values)
- Use `border-color: rgba(255,255,255,0.05)` for glass borders (near-invisible)
- Absolutely-positioned icons inside glass inputs need `z-10` to avoid being painted behind the blur stacking context

### Inline Backdrop Filter

When using `style={{ backdropFilter }}` in components, always use CSS variables:
```tsx
style={{ backdropFilter: 'blur(var(--glass-blur-strong-px))', WebkitBackdropFilter: 'blur(var(--glass-blur-strong-px))' }}
```
Never hardcode `blur(8px)`, `blur(24px)`, etc.

---

## State Management

Global state lives in `AppContext.tsx` via `useReducer`. Access with:
```tsx
const { state, dispatch, loadAll, can, signOut, tabHidden } = useApp()
```

Key state shape:
```ts
state.page          // current active page string
state.role          // 'admin' | 'trainer' | 'staff' | 'designer'
state.user          // Supabase auth user
state.designer      // linked Designer record (if role === 'designer')
state.designers     // Designer[]
state.trainings     // Training[]
state.sessions      // TrainingSession[]
state.attendance    // Attendance[]
state.enrollments   // TrainingEnrollment[]
state.designerSkills // DesignerSkill[]
state.users         // UserRoleRecord[]
state.teams         // Team[]
```

`can('canManageUsers')` etc. — permission check helper.

---

## Roles & Navigation

Two navigation sets in `AppShell.tsx`:

**Staff tabs** (admin / trainer / staff): Dashboard, Designers, Trainings, Attendance, Teams, Skill Set, Leaderboard, Hub, User Mgmt

**Designer tabs**: Home, Roadmap, History, Badges, Leaderboard, Hub

Navigation on **desktop**: sidebar (left, always visible).
Navigation on **mobile**: bottom tab bar only (sidebar removed). Top bar has logo, dark mode toggle, settings gear, and logout.

---

## Horizontal Scroll / Drag-to-Pan Pattern

`overflow-x-auto` on flex children in this layout chain (h-dvh → flex → overflow-y-auto main) does not produce a visible scrollbar. Use **drag-to-pan** instead:

```tsx
const scrollRef = useRef<HTMLDivElement>(null)
const drag = useRef({ active: false, x: 0, sl: 0, moved: false })

function onMouseDown(e: React.MouseEvent) {
  const target = e.target as HTMLElement
  if (target.closest('button')) return
  drag.current = { active: true, x: e.clientX, sl: scrollRef.current?.scrollLeft ?? 0, moved: false }
}
function onMouseMove(e: React.MouseEvent) {
  if (!drag.current.active || !scrollRef.current) return
  const dx = e.clientX - drag.current.x
  if (Math.abs(dx) > 4) drag.current.moved = true
  scrollRef.current.scrollLeft = drag.current.sl - dx
}
function onMouseUp() { drag.current.active = false }
```

Apply to container: `ref={scrollRef} onMouseDown onMouseMove onMouseUp onMouseLeave className="overflow-auto cursor-grab active:cursor-grabbing select-none"`

Use `drag.current.moved` to cancel click handlers when a pan occurred (threshold 4px).

---

## Recharts Usage

Charts used across the app:
- `AreaChart` + `Area` — attendance rate trends, team rankings, top platform
- `LineChart` + `Line` — platform skill distribution (dashed lines)
- `ComposedChart` + `Bar` + `Line` — attendance stats (present/absent bars + rate line)

All charts wrapped in `<ResponsiveContainer width="100%" height={N}>`.

Gradient fills use `<defs><linearGradient>` with `id` referenced in `fill="url(#gradId)"`.

---

## AnimatedNumber Component

`src/components/shared/AnimatedNumber.tsx` — animates from 0 to `value` on mount using `requestAnimationFrame` + `easeOutExpo`, duration 1100ms. Props: `value: number`, `suffix?: string`.

Used for all stat displays across Dashboard, Attendance, SkillSet, DesignerHome, DesignerBadges.

---

## Settings Panel

`src/components/layout/SettingsPanel.tsx` — floating glass card triggered by gear icon.

- Currently controls: **glass blur intensity** (slider 0–8, presets: Off/Subtle/Default/Strong/Max)
- Persists to `localStorage` under key `pt-glass-blur`
- `useGlassBlur()` hook — reads/writes the value and applies `--glass-blur` to `:root`
- `applyStoredGlassBlur()` — call on mount to restore saved setting

---

## Preferences & Working Style

- **No trailing summaries** — don't recap what was just done at the end of responses
- **Terse responses** — short updates at key moments; one sentence is enough
- **No comments in code** — only add a comment when the WHY is non-obvious
- **Commit style** — conventional commits (`feat:`, `fix:`, `docs:`), always include `Co-Authored-By: Claude Sonnet 4.6 <noreply@anthropic.com>`
- **Always update CHANGELOG.md and CLAUDE.md automatically** after every task — never wait to be asked. Include in the same commit or an immediate follow-up.
- **Push after every task** — commit and push when a logical unit of work is done
- **Drag-to-pan over CSS scroll** — see pattern above; never fight the layout chain with overflow hacks

---

## Future Session Locking

`isSessionFuture(sessionDate)` in `utils.ts` — returns `true` if `sessionDate > today()`. Used to disable attendance marking across all views until midnight on the session date:
- **Matrix**: columns dimmed + locked placeholder cells
- **Cards/Roster**: mark buttons replaced with a locked state UI
- **Session chips**: dimmed with lock icon

## Current Version

**v3.22** — see `CHANGELOG.md` for full history.
