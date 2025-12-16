# Personal Planner (Expo + Supabase)

Cross‑platform personal planning app built with Expo Router, React Native, and Supabase. It supports collaborative task lists, weekly/day scheduling, recurring tasks, and real‑time sync between devices.

## What’s inside

- Expo/React Native app with file‑based routing (see `app/`)
- Supabase backend for auth, storage, and real‑time data (see `supabase/migrations`)
- State/query layer powered by TanStack Query + MMKV offline cache
- Theming, reusable planner UI, and auth flows in `src/`

## Prerequisites

- Node.js 20+ and npm
- Expo CLI (installed automatically via `npx expo …`)
- Supabase project (cloud or local). Supabase CLI if you want to run the DB locally.
- Platform tooling for the target you want to run (Android Studio, Xcode, or a device with Expo Go).

## Quick start (fresh clone)

1. Install dependencies

   ```bash
   npm install
   ```

2. Configure environment variables (see next section) so Expo can reach your Supabase project.

3. Run the app

   ```bash
   npm start           # or: npm run android / npm run ios / npm run web
   ```

   Use the Expo Dev Tools prompt/QR code to open the app in a simulator, device, or web browser.

## Environment variables

The app reads Supabase credentials from `.env` files using Expo’s `EXPO_PUBLIC_` convention. Create one of the following files at the repo root (git‑ignored) with your own values:

```bash
# .env.local – default for local development
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-public-anon-key

# .env.production – values for a published build
# EXPO_PUBLIC_SUPABASE_URL=...
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...

# .env.machine – optional machine-specific override when tethering to a LAN Supabase instance
# EXPO_PUBLIC_SUPABASE_URL=http://192.168.x.x:54321
# EXPO_PUBLIC_SUPABASE_ANON_KEY=...
```

Notes:
- Keep these files out of version control (already covered by `.gitignore`).
- The keys must be prefixed with `EXPO_PUBLIC_` so they are available at runtime in the client bundle.

## Running Supabase locally (optional)

If you want to mirror production locally:

```bash
brew install supabase/tap/supabase   # or see Supabase docs
supabase start                           # launches local Postgres + API
supabase migration up                    # applies migrations in supabase/migrations
```

Update `.env.machine` to point at the local API URL printed by `supabase start`.

## Project tips

- Main entry is `app/_layout.tsx`; planner UI lives in `src/features/planner`.
- Auth screens are in `app/(auth)/` and `src/features/auth`.
- If the bundler gets stuck, clear caches with `expo start -c`.

Happy planning!
