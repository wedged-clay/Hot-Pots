# Hot—Pots 🏺

> A pottery swap community app for studio members. Give a piece, get a piece.

Hot—Pots is a Progressive Web App (PWA) that runs two-piece raffle swaps for pottery studio communities. Members submit two pieces each round — one is randomly matched, the other matched by ranked choice — and then message their partner to arrange the handoff.

Built with React + Vite, Supabase (auth, database, storage, edge functions), and deployed on Vercel.

---

## Project Status

This is currently a **UI prototype** with mock data. Backend integration (Supabase wiring, real auth, file uploads, push notifications) is the next phase.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Styling | Inline CSS (single-file components) |
| Database | Supabase (Postgres + RLS) |
| Auth | Supabase Auth (magic link + email/password) |
| Storage | Supabase Storage (pottery photos) |
| Push notifications | Web Push API + Supabase Edge Functions |
| Deployment | Vercel |
| PWA | Service Worker + Web App Manifest |

---

## File Structure

```
hotpots/
├── public/
│   ├── manifest.json          # PWA manifest (name, icons, shortcuts)
│   ├── service-worker.js      # Offline caching + push notification handler
│   └── icons/                 # App icons (see PWA-SETUP.md for generation)
│
├── src/
│   ├── App.jsx                # Main app — all 5 member tabs
│   ├── main.jsx               # React entry point
│   ├── components/
│   │   ├── auth-screens.jsx   # Auth flow UI (splash, sign in, sign up, onboarding)
│   │   ├── CameraCapture.jsx  # Camera + photo upload component
│   │   └── AdminPortal.jsx    # Admin portal (rounds, matches, stats, members)
│   └── hooks/
│       └── usePWA.js          # Install prompt, update detection, push subscription
│
├── supabase/
│   ├── functions/
│   │   └── push-notify/
│   │       └── index.ts       # Edge Function — sends all push notification types
│   └── migrations/
│       └── 001_admin_roles.sql # Role system + RLS policies
│
├── index.html                 # Vite entry point (includes PWA meta tags)
├── vite.config.js
├── package.json
├── .env.example               # Environment variable template (copy to .env)
├── .gitignore
├── PWA-SETUP.md               # Step-by-step guide for PWA setup and deployment
└── README.md
```

---

## Getting Started

### 1. Clone and install

```bash
git clone https://github.com/your-username/hotpots.git
cd hotpots
npm install
```

### 2. Set up environment variables

```bash
cp .env.example .env
```

Fill in `.env` with your Supabase project credentials and VAPID keys (see below).

### 3. Set up Supabase

1. Create a project at [supabase.com](https://supabase.com)
2. Run the SQL migration in the Supabase SQL Editor:
   ```
   supabase/migrations/001_admin_roles.sql
   ```
3. Set yourself as the first admin (instructions in the SQL file)
4. Enable Realtime on the `messages` table (Dashboard → Database → Replication)

### 4. Run locally

```bash
npm run dev
```

### 5. Deploy to Vercel

Connect your GitHub repo to Vercel and add the environment variables in Project Settings → Environment Variables. See `PWA-SETUP.md` for the full deployment checklist.

---

## Environment Variables

Copy `.env.example` to `.env` and fill in the values. **Never commit `.env`.**

| Variable | Where to get it |
|---|---|
| `VITE_SUPABASE_URL` | Supabase Dashboard → Settings → API |
| `VITE_SUPABASE_ANON_KEY` | Supabase Dashboard → Settings → API |
| `VITE_VAPID_PUBLIC_KEY` | Run `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | Same command (server-side only, never expose) |

---

## User Roles

| Role | Permissions |
|---|---|
| `member` | Enter rounds, view own matches, message partners |
| `helper` | Everything above + view all matches, stats, member list (read-only) |
| `admin` | Everything above + open/close rounds, trigger matching, manage members |

Roles are stored in `profiles.role` and enforced by Postgres RLS policies.

---

## Raffle Mechanics

Each round, members submit **two pieces**:

- **Piece 1 — Random Raffle:** Randomly paired with another member's Piece 1. Surprise element.
- **Piece 2 — Ranked Choice:** Members browse the gallery and rank pieces they'd like to receive. A rank-weighted matching algorithm (run by the admin) maximises total matches across the whole participant pool.

After matching, a 30-day messaging window opens between each matched pair to arrange the physical swap.

---

## Push Notifications

Five notification types are handled by the `push-notify` Edge Function:

| Type | Trigger |
|---|---|
| 💬 New message | DB webhook on `messages INSERT` |
| 🏺 Match made | DB webhook on `matches INSERT` |
| 🔥 Round open | DB webhook on `raffle_rounds UPDATE` (status → open) |
| 🎲 Results ready | DB webhook on `raffle_rounds UPDATE` (status → matching) |
| ⏳ Expiry warning | Daily `pg_cron` job, 3 days before conversation closes |

See `PWA-SETUP.md` for full setup instructions including VAPID key generation and webhook configuration.

---

## Admin Portal

Accessible via the **⚙️ Admin** tab (visible only to `admin` and `helper` roles).

- **Rounds** — open new rounds, trigger matching algorithm, publish results
- **Matches** — view all matches, resolve unmatched submissions, manually pair members
- **Stats** — member growth, participation rates, match rate, message activity
- **Members** — approve signups, manage roles, suspend/reinstate, regenerate invite codes

---

## PWA / Install

Hot—Pots is a fully installable PWA. Members can add it to their home screen on both Android and iOS (Safari → Share → Add to Home Screen).

- Offline support via service worker caching
- Push notifications (Android Chrome and iOS 16.4+)
- Background sync for messages sent while offline
- App shortcuts for Enter Raffle and Messages

See `PWA-SETUP.md` for the complete setup and testing guide.

---

## Contributing

This is a private studio tool. If you're a member of the development team, please create a branch for your changes and open a pull request against `main`. The `main` branch auto-deploys to Vercel.

---

## License

Private — all rights reserved.
