# Production Training Tracker

Internal PWA for the RWDS Design Team to manage, track, and analyze designer training programs.

## Stack

- **React 19 + Vite + TypeScript**
- **Supabase** — PostgreSQL + Auth
- **Tailwind CSS** — dark/light theme via CSS variables
- **Framer Motion** — layout transitions
- **Recharts** — attendance stats charts
- **Netlify** — static PWA deployment

## Getting Started

```bash
cd app
npm install
npm run dev
```

Copy `app/.env.example` to `app/.env` and fill in your Supabase URL and anon key.

## Docs

- [`CHANGELOG.md`](./CHANGELOG.md) — version history and feature notes
- [`database schema.md`](./database%20schema.md) — full table and column reference
- [`SYSTEM_DOCUMENTATION.md`](./SYSTEM_DOCUMENTATION.md) — architecture, features, and component guide

## DB Migration Required

After pulling, run this in Supabase SQL editor if you haven't already:

```sql
ALTER TABLE trainings DROP CONSTRAINT trainings_status_check;
ALTER TABLE trainings ADD CONSTRAINT trainings_status_check
  CHECK (status IN ('upcoming', 'active', 'on-hold', 'completed'));
```
