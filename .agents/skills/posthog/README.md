# PostHog Skill

Use this when adding or maintaining analytics in this Expo app.

## Current setup

- Client: `lib/posthog.js`
- Provider and screen tracking: `app/_layout.jsx`
- User identify/reset: `contexts/UserContext.jsx`
- Generated setup report: `posthog-setup-report.md`
- Long original reference docs: `.claude/skills/posthog-integration-expo/references/`

## Rules

1. Import the shared client:

   ```js
   import { posthog } from '../lib/posthog'
   ```

   Adjust the relative path as needed.

2. Use `snake_case` event names.
3. Track user actions and conversion points, not ordinary page views.
4. Screen tracking already happens with `posthog.screen(...)` in `app/_layout.jsx`.
5. Keep credentials in env vars exposed through `app.config.js` extras.
6. Avoid replacing existing integrations; add analytics beside existing logic.
7. Include useful properties such as ids, names/types, route/site ids, failure reasons, and booleans that help analysis.
8. Prefer minimal PII. If user identity is needed, rely on `posthog.identify()` in `UserContext.jsx`.
9. For caught exceptions in critical flows, capture `$exception` with a message and context.

## Common patterns

### Action event

```js
posthog.capture('example_action_completed', {
  entity_id: entity.id,
  source: 'screen_name',
})
```

### Failure event

```js
posthog.capture('example_action_failed', {
  reason: error.message,
  source: 'screen_name',
})
```

### Exception event

```js
posthog.capture('$exception', {
  $exception_message: error.message,
  context: 'example_action',
})
```

## Maintenance checklist

- Add new events to `.agents/skills/posthog/events.md` when instrumenting new behavior.
- Keep `posthog-setup-report.md` updated if making a broad analytics pass.
- Run the available test/build command after code edits.
