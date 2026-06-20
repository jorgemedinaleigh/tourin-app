---
name: integration-expo
description: Legacy PostHog Expo skill wrapper for tourin-app; canonical instructions live in .agents/SKILLS.md
metadata:
  author: PostHog
  version: 1.5.2
---

# Legacy PostHog skill wrapper

This Claude-specific skill is kept for compatibility only. Do not treat it as an independent source of truth.

Use the canonical, tool-agnostic instructions instead:

- `../../../AGENTS.md`
- `../../../.agents/SKILLS.md#posthog-analytics-skill`

Project-specific reminders:

- PostHog is already integrated in this JavaScript/JSX Expo Router app.
- Use the shared client from `lib/posthog.js`.
- Provider and manual screen tracking are in `app/_layout.jsx`.
- User identify/reset lives in `contexts/UserContext.jsx`.
- Keep keys in `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` via `app.config.js` extras.

Only read `references/` when you need deeper PostHog SDK documentation. Do not follow the old wizard workflow unless the user explicitly asks to rerun a full PostHog setup.
