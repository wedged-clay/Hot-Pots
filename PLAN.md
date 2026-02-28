# Hot—Pots — Project Plan

**Last updated:** February 2026  
**Status:** UI prototype complete · Backend not yet started

---

## What Is This

Hot—Pots is a Progressive Web App for pottery studio swap rounds. Members submit two pieces each round — one is randomly matched, one is matched by ranked choice — and then message their partner to arrange the physical handoff. The app is designed for a single studio community (~100 MAU initially), hosted free on Vercel, with Supabase as the backend.

---

## Current State

### ✅ Done — UI Prototype

All screens are built and interactive with mock data. A developer can open any file and see exactly what needs to be wired up.

| File | What it contains | Status |
|---|---|---|
| `pottery-swap.jsx` | Main app — all 5 member tabs | ✅ Complete (mock data) |
| `auth-screens.jsx` | Splash, sign in, sign up, magic link, forgot password, onboarding (2 steps) | ✅ Complete (fake auth) |
| `CameraCapture.jsx` | Live camera viewfinder, photo review, compression, file upload fallback | ✅ Complete (ready to wire) |
| `AdminPortal.jsx` | Round management, match oversight, stats, member management | ✅ Complete (mock data) |
| `service-worker.js` | Cache strategies, push notification handler, background sync | ✅ Complete |
| `manifest.json` | PWA manifest — name, icons, shortcuts, theme colour | ✅ Complete |
| `usePWA.js` | Install prompt, update detection, push subscription hook | ✅ Complete |
| `push-notify.ts` | Supabase Edge Function — all 5 notification types | ✅ Complete |
| `admin-roles.sql` | Role system (member/helper/admin), all RLS policies, stats view | ✅ Complete |
| `README.md` | Project overview, setup instructions, role/mechanics docs | ✅ Complete |
| `.gitignore` | Node, Vite, Supabase, OS, editor ignores | ✅ Complete |
| `.env.example` | All required environment variables with instructions | ✅ Complete |
| `PWA-SETUP.md` | Step-by-step PWA + Vercel deployment guide | ✅ Complete |

### What "Complete (mock data)" means

The UI prototype uses hardcoded mock objects at the top of `pottery-swap.jsx` — `mockUser`, `mockRound`, `mockMatches`, `mockConversations`, `mockGallery`. Auth flows use a `fakeLoad()` timeout instead of real Supabase calls. Nothing is persisted. This is intentional — it lets you review and approve the full UX before any backend work begins.

---

## What Still Needs Building

Everything below is backend integration and project scaffolding. The UI for all of it is already done.

### Phase 1 — Project Setup (1–2 days)
*Do this before any other dev work.*

- [ ] Create GitHub repository and push all files
- [ ] Set up Vite + React project structure (`npm create vite@latest`)
- [ ] Move files into correct directories (see README for structure)
- [ ] Create Supabase project at supabase.com
- [ ] Run `admin-roles.sql` migration in Supabase SQL Editor
- [ ] Set first admin user (update the UUID in the SQL file)
- [ ] Connect Vercel to GitHub repo
- [ ] Add environment variables to Vercel

### Phase 2 — Auth (2–3 days)

- [ ] Install Supabase JS client (`npm install @supabase/supabase-js`)
- [ ] Create `src/lib/supabase.js` client singleton
- [ ] Replace `fakeLoad()` in `auth-screens.jsx` with real Supabase calls:
  - `signInWithPassword` (sign in screen)
  - `signUp` (sign up screen) + insert into `profiles` table
  - `signInWithOtp` (magic link screen)
  - `resetPasswordForEmail` (forgot password screen)
  - `updateUser` (new password screen)
- [ ] Wire `supabase.auth.onAuthStateChange()` in `App.jsx` to show auth vs main app
- [ ] On signup completion, insert `profiles` row with `display_name` from onboarding step 1
- [ ] Validate studio invite code against a `studio_codes` table before allowing signup
- [ ] Gate main app behind authenticated session

### Phase 3 — Core Data (3–4 days)

- [ ] Replace `mockRound` with live query: `supabase.from('raffle_rounds').select()`
- [ ] Replace `mockUser` with `supabase.auth.getUser()` + profiles join (including role)
- [ ] Replace `mockGallery` with live piece 2 gallery query (other members' submissions in active round)
- [ ] Wire piece submission form — save to `submissions` table on "Submit Both Pieces"
- [ ] Wire photo upload — `CameraCapture.onCapture` → `supabase.storage.upload()` → save URL to submission
- [ ] Replace `mockMatches` with live query on `matches` table
- [ ] Replace `mockConversations` with live query on `conversations` + `messages` tables

### Phase 4 — Realtime Messaging (1–2 days)

- [ ] Subscribe to `messages` table via Supabase Realtime (filter by `conversation_id`)
- [ ] Wire message send — insert into `messages` table
- [ ] Show live unread counts and update on new message
- [ ] Wire background sync in `service-worker.js` — save failed sends to IndexedDB, retry on reconnect

### Phase 5 — PWA (1 day)

- [ ] Generate all icon sizes from logo PNG (see `PWA-SETUP.md` step 2)
- [ ] Add PWA meta tags to `index.html` (see `PWA-SETUP.md` step 3)
- [ ] Register service worker in `main.jsx` (see `PWA-SETUP.md` step 4)
- [ ] Add `usePWA` hook to `App.jsx` — wire install banner and update notification
- [ ] Add `vercel.json` with SPA rewrite rule and service worker cache headers

### Phase 6 — Push Notifications (1–2 days)

- [ ] Generate VAPID keys: `npx web-push generate-vapid-keys`
- [ ] Add keys to Supabase Edge Function secrets and `.env`
- [ ] Deploy push-notify Edge Function: `supabase functions deploy push-notify`
- [ ] Create `push_subscriptions` table (SQL in `PWA-SETUP.md`)
- [ ] Wire `usePWA.enablePush(userId)` call — trigger after first match result
- [ ] Set up 4 Database Webhooks in Supabase Dashboard (messages, matches, raffle_rounds × 2)
- [ ] Set up `pg_cron` job for daily expiry warnings (SQL in `push-notify.ts` header comments)

### Phase 7 — Admin Portal (1–2 days)

- [ ] Replace `AdminPortal.jsx` stub in `pottery-swap.jsx` with real import
- [ ] Wire Round Management — real queries + mutations on `raffle_rounds`
- [ ] Wire "Run Matching" button to call the matching Edge Function (see below)
- [ ] Wire Match Oversight — real queries on `matches`, manual pair inserts
- [ ] Wire Stats section to `admin_stats` view (defined in `admin-roles.sql`)
- [ ] Wire Member Management — real queries on `profiles`, role updates, status changes

### Phase 8 — Matching Algorithm (2–3 days)
*This is the most technically complex piece.*

- [ ] Create a new Supabase Edge Function: `supabase functions new run-matching`
- [ ] Implement Piece 1 matching: random shuffle and pair all Piece 1 submissions
- [ ] Implement Piece 2 matching: rank-weighted bipartite assignment across all `piece_2_rankings`
  - Greedy best-first (simpler, good enough for <200 participants) or
  - Hungarian algorithm (optimal, worth it if participation grows)
- [ ] Insert results into `matches` table
- [ ] Create `conversations` row for each match (set `expires_at` = round `closes_at` + 30 days)
- [ ] Update `raffle_rounds.status` to `'matching'` (triggers push notification webhook)
- [ ] Flag unmatched submissions for admin review
- [ ] Wire "Run Matching" button in AdminPortal to call this function

---

## Data Model

Full schema with comments is in `pottery-swap.jsx` lines 1–90. Summary:

```
profiles          — user accounts, display name, avatar, role
raffle_rounds     — swap rounds with open/matching/complete status  
submissions       — two pieces per user per round, piece_2_rankings jsonb
matches           — pairs of submissions, match_type random|choice
conversations     — one per match, expires 30 days after round closes
messages          — threaded messages within a conversation
push_subscriptions — Web Push subscription objects per user
```

RLS policies and the `get_my_role()` helper function are all in `admin-roles.sql`.

---

## Roles & Permissions

| Action | member | helper | admin |
|---|:---:|:---:|:---:|
| Enter rounds, submit pieces | ✅ | ✅ | ✅ |
| View piece 2 gallery | ✅* | ✅ | ✅ |
| Message match partner | ✅ | ✅ | ✅ |
| View all matches & stats | ❌ | ✅ | ✅ |
| Open / close rounds | ❌ | ❌ | ✅ |
| Trigger matching algorithm | ❌ | ❌ | ✅ |
| Manage member roles | ❌ | ❌ | ✅ |
| Read all messages (moderation) | ❌ | ❌ | ✅ |

*Gallery access requires having submitted in the same round.

---

## App Screens

### Member app
- **Home** — active round banner, how-it-works steps, past swaps teaser, donation prompt
- **Enter Raffle** — 2-step piece submission form with camera/upload, piece 2 gallery + ranking
- **My Swaps** — match history with piece details and match type
- **Messages** — conversation list with expiry countdowns + message thread view
- **Profile** — display name, bio, swap stats, privacy note

### Auth flow
- Splash → Sign In / Sign Up / Magic Link → Check Email → Onboarding (profile + invite code)
- Forgot Password → Check Email → New Password

### Admin portal (hidden tab, role-gated)
- Rounds — lifecycle management with phase stepper
- Matches — full match list with filters, manual pairing
- Stats — member growth chart, participation per round, 6 headline metrics
- Members — role management, invite code, approve/suspend

---

## Decisions Made

| Topic | Decision | Reason |
|---|---|---|
| Hosting | Vercel (free tier) | Free, auto-deploys from GitHub, good PWA support |
| Backend | Supabase | Free tier, built-in auth + realtime + storage + edge functions |
| Auth method | Magic link (primary) + email/password (secondary) | Simpler for studio members, no password resets needed |
| Signup gate | Studio invite code | Keeps the app members-only without email domain restrictions |
| Photo storage | Supabase Storage | Integrated, handles CDN, RLS on buckets |
| Native app? | PWA only (for now) | No App Store friction, instant deploys, covers 95% of needs |
| Piece 2 matching | Ranked choice + algorithm | Better outcomes than mutual-like; admin controls timing |
| Messaging window | 30 days post-round | Long enough to arrange swap, auto-closes cleanly |
| Donations | Buy Me a Coffee widget | Zero-fee, no payment integration complexity |
| Admin roles | member / helper / admin | Three tiers covers the "me + 1-2 helpers" use case without over-engineering |

---

## Estimated Remaining Work

| Phase | Effort | Dependencies |
|---|---|---|
| 1. Project Setup | 1–2 days | GitHub repo, Supabase account, Vercel account |
| 2. Auth | 2–3 days | Phase 1 |
| 3. Core Data | 3–4 days | Phase 2 |
| 4. Realtime Messaging | 1–2 days | Phase 3 |
| 5. PWA | 1 day | Phase 1 |
| 6. Push Notifications | 1–2 days | Phase 3, 5 |
| 7. Admin Portal | 1–2 days | Phase 3 |
| 8. Matching Algorithm | 2–3 days | Phase 3, 7 |
| **Total** | **~2.5–3 weeks** | For a single developer |

---

## Open Questions

- **Invite code flow** — should the code gate signup entirely, or allow signup and require code before entering a round? Currently designed as a signup gate.
- **Photo moderation** — no moderation on pottery photos currently. Fine for a trusted studio community, worth revisiting if the app ever opens more broadly.
- **Multiple studios** — the current data model is single-tenant (one studio). A `studio_id` column could be added later for multi-tenancy, but adds complexity now.
- **Buy Me a Coffee URL** — the donation button `href` is currently `"#"`. Replace with real BMC URL when ready.
- **Matching algorithm** — greedy best-first is recommended to start. If rounds grow beyond ~50 participants and match rate drops, revisit with the Hungarian algorithm.
