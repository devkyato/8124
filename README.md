# 8124

8124 Ranked is a full-stack competitive take on 2048. It keeps the familiar game, then adds local email/password accounts, persistent profiles, rank progression, badges, weekly leaderboards, and 2048 speedruns.

the game stays simple, but the project uses the kind of setup i would be comfortable growing into a larger product.

## tech stack

- next.js app router for the full-stack framework
- react and typescript for the interface and game logic
- Supabase Auth for local email/password accounts
- Supabase Postgres with RLS for profiles, runs, badges, and weekly rankings
- a static Next.js export for GitHub Pages
- Supabase RLS and database constraints for protected player data and run submission
- zod for backend request validation
- react icons for the control guide
- vitest for game-logic tests
- `localstorage` for resumable in-progress games

## Supabase setup

1. Create a Supabase project.
2. Open the SQL editor and run `supabase/schema.sql` once.
3. Copy `.env.example` to `.env.local` and add the project URL and publishable key. Keep the secret key server-only and never prefix it with `NEXT_PUBLIC_`.
4. In Supabase Authentication, enable Email and choose whether email confirmation is required.

The SQL includes row-level security. Players can read the public leaderboard, submit runs only as themselves, and edit only their own username/display name. Rank, XP, totals, speedruns, and badges are computed by database triggers rather than trusted from the browser.

## GitHub Pages

Pushes to `main` run the Pages workflow in `.github/workflows/deploy-pages.yml`. The workflow tests the game, creates a static export, and deploys it to `https://devkyato.github.io/8124/`.

The workflow needs `NEXT_PUBLIC_SUPABASE_URL` as a GitHub Actions variable and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` as an Actions secret. The Supabase secret key is never part of the Pages build.

## run

install the packages and start the development server:

```sh
npm install
npm run dev
```

then open `http://localhost:3000`.

run the tests with `npm test` and create a production build with `npm run build`.

## controls

- arrow keys or wasd on a keyboard
- swipe on a phone or tablet

## credits

built by [@devmako](https://github.com/devmako) and based on the original 2048 by gabriele cirulli.

made for the cool guy quantum.
