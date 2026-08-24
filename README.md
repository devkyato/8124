# 8124

[![Deploy GitHub Pages](https://github.com/devkyato/8124/actions/workflows/deploy-pages.yml/badge.svg)](https://github.com/devkyato/8124/actions/workflows/deploy-pages.yml)

8124 Ranked is a competitive take on 2048 with email/password accounts, persistent player profiles, rank progression, badges, weekly leaderboards, and 2048 speedruns.

**Live app:** [https://devkyato.github.io/8124/](https://devkyato.github.io/8124/)

## features

- playable 2048 with keyboard, swipe, and solver controls
- ranks from Unranked through Grandmaster, driven by earned XP
- player profiles, best scores, best tiles, run totals, and speedrun times
- automatic achievement badges
- weekly scoring, placement, and leaderboard statistics
- protected email/password accounts through Supabase Auth

## tech stack

- Next.js App Router with a static GitHub Pages export
- react and typescript for the interface and game logic
- Supabase Auth for email/password accounts
- Supabase Postgres, RLS, triggers, and constraints for profiles, runs, badges, ranks, and weekly standings
- react icons for the control guide
- vitest for game-logic tests
- `localstorage` for resumable in-progress games

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql` once.
3. Copy `.env.example` to `.env.local` and add the project URL and publishable key. Keep the secret key server-only and never prefix it with `NEXT_PUBLIC_`.
4. In Supabase Authentication, enable Email and choose whether email confirmation is required.
5. Set both the Auth Site URL and redirect allowlist to the deployed app URL.

The SQL includes row-level security. Players can read the public leaderboard, submit runs only as themselves, and edit only their own username/display name. Rank, XP, totals, speedruns, and badges are computed by database triggers rather than trusted from the browser.

## GitHub Pages

Pushes to `main` run `.github/workflows/deploy-pages.yml`. The workflow installs dependencies, runs the tests, creates a static export in `out`, and deploys it to GitHub Pages.

The workflow needs `NEXT_PUBLIC_SUPABASE_URL` as a GitHub Actions variable and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as an Actions secret. The Supabase secret key is never part of the Pages build.

GitHub Pages does not run a Next.js server. The deployed browser communicates directly with Supabase using the publishable key; authorization is enforced by database row-level security, column grants, constraints, and triggers.

## run

install the packages and start the development server:

```sh
npm install
npm run dev
```

then open `http://localhost:3000`.

Useful verification commands:

```sh
npm test
npm run build
npm run check:supabase
npm run check:supabase:e2e
```

The end-to-end check creates a temporary player, verifies authentication, protected profile fields, ranked-run validation, XP, badges, speedruns, and weekly totals, then removes the test account and its data.

## controls

- arrow keys or wasd on a keyboard
- swipe on a phone or tablet

## credits

built by [@devmako](https://github.com/devmako) and based on the original 2048 by gabriele cirulli.

made for the cool guy quantum.
