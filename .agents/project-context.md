# Project Context

## Product

Tourin is a gamified mobile app for exploring points of interest, viewing routes, stamping site visits, unlocking achievements, and managing a user profile.

## Architecture

- `app/` contains Expo Router routes and layouts.
  - `app/_layout.jsx` sets global providers and root navigation.
  - `app/auth/` contains login/register screens.
  - `app/dashboard/` contains main app screens such as map, passport, achievements, profile, and route details.
- `components/` contains reusable UI and map components.
- `contexts/` contains global providers:
  - `UserContext.jsx` for Supabase auth/profile state.
  - `I18nContext.jsx` for language state.
  - `GeoDataContext.jsx` for geographic/site data.
- `hooks/` contains domain data hooks for achievements, visits, leaderboard, stats, routes, and profile/avatar behavior.
- `lib/` contains external clients and shared business helpers.
- `utils/` contains pure utility functions.
- `i18n/` contains i18next setup, locale JSON, and localized field helpers.

## External services

- Supabase: auth, profiles, private user details, content tables, storage.
- PostHog: analytics, screen tracking, user identification, event capture.
- MapLibre / react-native-maps: map rendering and navigation-related UI.

## Data conventions

- Supabase client config lives in `lib/supabase.js` and requires public env vars.
- Localized content may use JSON fields and legacy suffixed fields. Follow `docs/supabase-content-fields.md`.
- Profile locale/avatar/country data live in `profiles`; date of birth lives in `user_private_details`.

## Coding style

- JavaScript/JSX, single quotes, no semicolons.
- Functional React components and hooks.
- Keep changes localized to existing architecture.
- Prefer explicit error handling around auth, location, stamping, and network calls.

## Validation

- Run `npm test` after changing utilities, i18n helpers, or route-label/geo logic.
- For app/runtime changes, use `npm run start` or platform builds as appropriate.
