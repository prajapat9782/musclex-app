# MuscleX

A fitness app for athletes: daily habits and streaks, a calorie and macro plan built from your profile, full food logging (search, barcode scan, saved meals, quick add, past days) and a water tracker.

Built with **Expo (React Native, TypeScript)** and **Supabase**.

## What's in this build

| Area | Status |
|---|---|
| Welcome, sign up / log in (email + password), password reset | ✅ |
| 6-step profile setup with real calorie maths (Mifflin-St Jeor), metric/imperial | ✅ |
| Home: streak, weekly check-ins, habits, today's calories | ✅ |
| Meal plan: goal switcher, target, macros, suggested meals, water | ✅ |
| Food diary: any past day, week view, copy previous day | ✅ |
| Log food: starter foods + USDA + Open Food Facts search, recent, My meals, quick add | ✅ |
| Meal details: edit portions, remove, save as my meal, repeat yesterday | ✅ |
| Barcode scanner (camera) with Open Food Facts lookup | ✅ |
| Water tracker | ✅ |
| Profile: theme (dark/light/system), accent colour, units, privacy, news topics, delete account | ✅ |
| Progress (7-day calories & water) | 🟡 first version |
| Live workout, exercise library, PRs, community, notifications | ⏭ next build |
| News | ⏸ on hold |

## Run it

You need Node 20+ and the **Expo Go** app on your phone.

```bash
npm install
npx expo start
```

Scan the QR code with your phone camera (iOS) or the Expo Go app (Android).

> Without a `.env` the app runs in **demo mode**: no sign-in, everything is saved on the device. Good for trying it out.

## Connect Supabase (real accounts)

1. Create a free project at [supabase.com](https://supabase.com).
2. In the dashboard open **SQL Editor**, paste the contents of [`supabase/migrations/0001_init.sql`](supabase/migrations/0001_init.sql) and run it. This creates the tables with Row Level Security, so each user can only read and write their own data.
3. **Authentication → Providers → Email**: keep it enabled. Turn **Confirm email** off while testing if you want instant sign-up.
4. Copy `.env.example` to `.env` and fill in **Project Settings → API**:
   ```
   EXPO_PUBLIC_SUPABASE_URL=https://xxxx.supabase.co
   EXPO_PUBLIC_SUPABASE_ANON_KEY=eyJ...
   ```
5. Optional: get a free USDA key at <https://fdc.nal.usda.gov/api-key-signup> and set `EXPO_PUBLIC_USDA_API_KEY` for generic foods in search.
6. Restart `npx expo start`.

The anon key is safe to ship in the app; Row Level Security is what protects the data. Never put the `service_role` key in the app.

## Project layout

```
src/app/            screens (Expo Router — every file is a route)
  (tabs)/           Home, Progress, Community, Meals, News
  food/             diary, log, meal details, barcode scan
  onboarding.tsx    6-step setup
src/components/     UI building blocks and icons
src/data/           types, data access (Supabase or on-device), profile state
src/lib/            calorie maths, food search (USDA, Open Food Facts), dates, Supabase client
src/theme/          colours, fonts, dark/light, accent, units
supabase/           database schema
```

## Going live

1. **Accounts**: Apple Developer ($99/year), Google Play Console ($25 once), an [Expo](https://expo.dev) account.
2. **Build**: `npx eas-cli@latest build --profile production --platform all`. Test first with `--profile preview` on TestFlight / Play internal testing.
3. **Store requirements** for health & fitness apps:
   - Privacy policy URL (what you collect: email, body stats, food logs).
   - In-app account deletion — done (Profile → Delete account, backed by `delete_my_account()`).
   - Health disclaimer — shown in setup and Profile.
   - Camera permission text — set in `app.json`.
4. **Submit**: `npx eas-cli@latest submit --platform all`.
5. **Updates**: `npx eas-cli@latest update` ships JavaScript fixes without a store review.

Before launch, also consider moving the USDA call behind a Supabase Edge Function so the key isn't in the app, and adding error monitoring (e.g. Sentry).

## Checks

```bash
npm run typecheck
```
