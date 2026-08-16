# J.A.R.V.I.S. Command Center

Real-time AI agent operations dashboard — 111 specialists, one mission control.

## Stack

- **Next.js 14** (App Router)
- **Tailwind CSS** — dark HUD theme
- **Framer Motion** — live card animations
- **Zustand** — local state + simulation engine
- **Supabase** (optional) — real-time agent status via Postgres changes

## Features

- Kanban board: Queued / Active / Completed columns
- Live simulation: agents cycle through states every 2.8 s
- Stats bar: counts, completion %, animated counters
- Responsive: mobile → wide desktop

## Supabase (optional)

Set env vars to enable live updates:

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

Without them, the app runs in local simulation mode — no backend required.

## Deploy

```bash
# GitHub
gh repo create jarvis-command-center --public --source=. --remote=origin --push

# Vercel
vercel --prod --yes --name jarvis-command-center
```

## Local dev

```bash
npm install
npm run dev
# → http://localhost:3000
```
test
