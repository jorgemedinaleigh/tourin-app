# Agent Instructions

This is the canonical AI-agent entry point for this repo. Prefer this file plus `.agents/` for project context. The existing `.claude/` folder is Claude-specific/legacy context and should be treated as reference material unless the user explicitly asks to work on Claude skills.

## Project snapshot

- Expo SDK 53 + React Native 0.79 + React 19 app using Expo Router.
- JavaScript/JSX codebase; current style is single quotes and no semicolons.
- Supabase handles auth, database, and storage.
- PostHog analytics are configured in `lib/posthog.js` and provided from `app/_layout.jsx`.
- i18n uses i18next with `en`, `es`, and `pt`; default locale is Spanish (`es`).

## Working rules

- Check `git status --short` before edits and do not overwrite user changes.
- Read the nearest relevant files before changing code.
- Make minimal, targeted changes; avoid broad refactors unless requested.
- Keep secrets in environment variables. Never hardcode Supabase or PostHog keys.
- Preserve existing app architecture: Expo Router screens in `app/`, reusable UI in `components/`, shared state in `contexts/`, data hooks in `hooks/`, service clients/utilities in `lib/` and `utils/`.
- If changing bundle IDs/package names/schemes, confirm whether the app is already published first.

## Key paths

- `app.config.js` — Expo app config, icons, deep-link scheme, Android package, EAS project ID, analytics extras.
- `app/_layout.jsx` — root providers, PostHog provider, screen tracking, root stack.
- `contexts/UserContext.jsx` — Supabase auth/session/profile state and PostHog identify/reset.
- `lib/supabase.js` — Supabase client and required env vars.
- `lib/posthog.js` — PostHog client and required env vars.
- `i18n/` — translation setup and locale JSON files.
- `docs/` — project notes and Supabase content conventions.
- `.agents/` — concise context and workflows for generic AI agents.
- `.claude/` — original Claude Code skill material, mostly PostHog reference docs.

## Commands

```bash
npm install
npm run start
npm run android
npm run ios
npm run web
npm test
```

There is no lint script in `package.json` right now. Use `npm test` for available automated checks.

## Environment variables

Expected local `.env` values include:

```env
EXPO_PUBLIC_SUPABASE_URL=
EXPO_PUBLIC_SUPABASE_PUBLISHABLE_KEY=
EXPO_PUBLIC_POSTHOG_API_KEY=
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

`EXPO_PUBLIC_SUPABASE_ANON_KEY` is also accepted as a fallback for Supabase.

## PostHog rules

- Use the shared `posthog` instance from `lib/posthog.js`.
- Event names use `snake_case`.
- Prefer action/conversion events over generic page views; screen tracking already happens in `app/_layout.jsx`.
- Identify users after login/signup in `contexts/UserContext.jsx`; reset on logout.
- Add useful, non-sensitive properties and avoid hardcoded credentials.

See `.agents/skills/posthog/` for the concise PostHog guide.

## i18n rules

- Add or update strings in every locale: `i18n/locales/en`, `i18n/locales/es`, and `i18n/locales/pt`.
- Keep namespaces consistent with existing files.
- For localized Supabase content, follow `docs/supabase-content-fields.md` and `i18n/getLocalizedField.js`.

## App naming caution

For display-name changes, update `app.config.js` and Android `strings.xml`. Do not change `android.package` / native application IDs for a published app unless the user wants a new store app.
