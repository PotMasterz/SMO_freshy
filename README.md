# SMO_freshy

A passcode-entry web app for the freshers' / orientation event. Players each
get **5 paper riddles**; for each riddle they punch a **4-digit passcode** into
the website. The site checks it against per-player codes set by an admin.

- **7 fixed players**, each starting with 6 riddle slots (admin can add more, up to 20).
- **3 attempts** per slot, then a **60-second cooldown** for *that slot only* —
  the player can keep trying their other riddles.
- **Solved state persists** across refresh / logout / new device.
- A solved slot is only reset when the admin **changes that slot's passcode**.
- No public sign-up. Admins create the 7 player accounts in the dashboard.
- **No email required** — players log in with a username + password only.
  Internally a synthetic email (`username@smo.game`) is used for Supabase Auth,
  but players never see or type it.
- The riddle text itself lives **on paper at the venue** — the website only
  stores the answer codes.

## Stack

- Next.js 14 (App Router) + React + TypeScript + Tailwind CSS
- Supabase Postgres + Auth
- Hosted on Vercel + Supabase cloud (no LAN required)

## Local development

```bash
npm install
cp .env.local.example .env.local
# Fill in NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY
npm run dev
```

Open http://localhost:3000.

## One-time Supabase setup

1. Create a free project at <https://supabase.com>.
2. In **SQL editor**, paste the contents of `supabase/migrations/0001_init.sql`
   and run it. This creates the tables, the trigger, and the row-level security
   policies.
3. In **Authentication → Users**, click **Add user** and create your admin
   account (e.g. `admin@example.com`).
4. Back in the SQL editor, run:
   ```sql
   update profiles set is_admin = true where email = 'admin@example.com';
   ```
5. From **Project Settings → API**, copy:
   - Project URL → `NEXT_PUBLIC_SUPABASE_URL`
   - anon public key → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - service_role key → `SUPABASE_SERVICE_ROLE_KEY`

Put them in `.env.local` (locally) and into your Vercel project's environment
variables (production).

## Deploy to Vercel

1. Push this repo to GitHub.
2. Go to <https://vercel.com>, **Add New… → Project**, import the repo.
3. Paste the three Supabase env vars.
4. Deploy. You'll get a public HTTPS URL like `https://smo-freshy.vercel.app`.

Players can now sign in **from any device on any network**.

## Event-day workflow

1. Sign in at `https://your-url/login` with the admin account → you land on
   `/admin`.
2. For each of the 7 players:
   - Click **Create player** in an empty slot.
   - Enter a **username** + a password (write both on the slip you'll hand them). No email needed.
   - On the next screen, set the 4-digit passcode for each riddle. Use **+ Add riddle** if you need more than 6.
3. Hand each player their **username + password slip** together with their paper
   riddles.
4. Players sign in at `/login` and start cracking codes.
5. Watch progress live from `/admin`. Use the **Reset** button if a player gets
   stuck. Change a passcode mid-event by editing the slot — the player's
   progress for that slot is automatically reset.

## Routes

| Path | Who | Purpose |
| --- | --- | --- |
| `/` | Anyone | Landing → Login CTA |
| `/login` | Anyone | Email/password login |
| `/play` | Player | The riddle stage cards |
| `/admin` | Admin | Player roster |
| `/admin/players/new` | Admin | Create a new player |
| `/admin/players/[id]` | Admin | Set passcodes for that player |

## Project layout

```
src/
├── middleware.ts
├── app/
│   ├── layout.tsx
│   ├── page.tsx
│   ├── login/
│   ├── play/
│   ├── admin/
│   └── api/
└── lib/
    ├── auth.ts
    ├── passcode.ts
    ├── requireAdmin.ts
    └── supabase/
supabase/
└── migrations/0001_init.sql
```
