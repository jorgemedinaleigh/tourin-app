# Agent Skills and Workflows

This is the single source of truth for reusable agent skills and workflows in this repository.

- Start with `AGENTS.md` for project-wide rules, then use this file for task-specific guidance.
- If `.agents/skills/*`, `.agents/workflows/*`, `.claude/skills/*`, or older reports mention a skill, treat them as compatibility pointers or vendor references, not independent instructions.
- When a skill changes, update this file instead of duplicating guidance elsewhere.

## PostHog analytics skill

Use this when adding or maintaining analytics in the Expo app.

### Current setup

- SDK package: `posthog-react-native`.
- Shared client: `lib/posthog.js`.
- Env/config path: `.env` → `app.config.js` `expo.extra` → `expo-constants` in `lib/posthog.js`.
- Required public env vars:
  - `EXPO_PUBLIC_POSTHOG_API_KEY`
  - `EXPO_PUBLIC_POSTHOG_HOST` (defaults to `https://us.i.posthog.com`)
- Root provider and manual Expo Router screen tracking: `app/_layout.jsx`.
- User identify/reset: `contexts/UserContext.jsx`.
- Historical setup report: `posthog-setup-report.md`.
- Deep SDK references, only when needed: `.claude/skills/posthog-integration-expo/references/`.

### Rules

1. Import the shared client and adjust the relative path as needed:

   ```js
   import { posthog } from '../lib/posthog'
   ```

2. Use lowercase `snake_case` event names.
3. Track user actions, conversions, and recoverable failures; do not add generic page-view events because screen tracking already runs in `app/_layout.jsx`.
4. Add useful non-sensitive properties such as ids, names/types, route/site ids, booleans, and failure reasons.
5. Avoid PII in event properties. If user identity is needed, rely on `posthog.identify()` in `UserContext.jsx`.
6. Keep credentials in environment variables and `app.config.js` extras. Never hardcode PostHog keys.
7. Add analytics beside existing logic. Do not replace Supabase, navigation, auth, or UI flow code just to track an event.
8. For caught exceptions in critical flows, capture `$exception` and include the nearby screen/context. Match the existing `$exception` shape used in nearby files when modifying existing code.
9. Reset PostHog on logout with `posthog.reset()` after the app clears user state.

### Common patterns

Action event:

```js
posthog.capture('example_action_completed', {
  entity_id: entity.id,
  source: 'screen_name',
})
```

Failure event:

```js
posthog.capture('example_action_failed', {
  reason: error.message,
  source: 'screen_name',
})
```

Exception event:

```js
posthog.capture('$exception', {
  $exception_message: error.message,
  context: 'example_action',
})
```

### Current PostHog event inventory

This inventory is based on current source references to `posthog.capture(...)`.

| Event | Purpose | Primary file(s) |
|---|---|---|
| `user_signed_up` | Successful registration or confirmation-required registration | `contexts/UserContext.jsx` |
| `user_logged_in` | Successful login | `contexts/UserContext.jsx` |
| `user_logged_out` | Logout action | `contexts/UserContext.jsx` |
| `legal_documents_accepted` | User accepts the current Terms and Privacy documents | `contexts/UserContext.jsx` |
| `legal_documents_accept_failed` | Failed attempt to save legal document acceptance | `contexts/UserContext.jsx` |
| `login_failed` | Failed login attempt | `app/auth/loginScreen.jsx` |
| `signup_failed` | Failed registration attempt | `app/auth/registerScreen.jsx` |
| `site_info_viewed` | User opens a heritage-site info card | `app/dashboard/mapScreen.jsx` |
| `metro_info_viewed` | User opens a metro-station info card | `app/dashboard/mapScreen.jsx` |
| `location_centered` | User centers map on current location | `app/dashboard/mapScreen.jsx` |
| `site_stamped` | Successful site stamp / visit conversion | `components/InfoCard.jsx` |
| `stamp_failed` | Failed stamp attempt | `components/InfoCard.jsx` |
| `external_website_clicked` | User opens a site website | `components/InfoCard.jsx` |
| `site_directions_opened` | User attempts to open directions for a site | `components/InfoCard.jsx` |
| `route_maps_opened` | User opens route navigation/maps | `app/dashboard/routeDetails.jsx` |
| `achievement_unlocked` | Achievement unlock | `hooks/useAchievements.js` |
| `achievement_viewed` | User opens an achievement badge/detail | `app/dashboard/achievementsScreen.jsx` |
| `summary_viewed` | User opens a daily or weekly exploration recap | `app/dashboard/summaryScreen.jsx` |
| `summary_shared` | User completes the native share flow for a recap card | `app/dashboard/summaryScreen.jsx` |
| `summary_recommendation_opened` | User follows the next-adventure recommendation from a recap | `app/dashboard/summaryScreen.jsx` |
| `summary_preferences_updated` | User saves recap notification and sharing preferences | `hooks/useSummaryPreferences.js` |
| `summary_notification_opened` | User opens a recap from a push notification | `app/_layout.jsx` |
| `$exception` | Captured exception in critical flows | `app/auth/*`, `components/InfoCard.jsx` |

Naming convention:

- Custom product events use lowercase `snake_case`.
- Prefer past-tense action names for completed actions: `site_stamped`, `achievement_unlocked`.
- Use `_failed` for recoverable user-flow failures.

### Maintenance checklist

- Update the event inventory in this file when adding, renaming, or removing `posthog.capture(...)` calls.
- Keep `posthog-setup-report.md` updated only when making a broad analytics pass.
- Check `package.json` before validation; currently there is no lint script and `npm test` is the available automated test command.

## App name change workflow

Use this when the user wants to rename the app.

### Display name only

Update:

- `app.config.js` → `expo.name`
- `android/app/src/main/res/values/strings.xml` → `app_name`

Then rebuild/reinstall the app.

### Project slug/package naming

If the user also wants project identifiers changed, consider:

- `app.config.js` → `expo.slug`
- `app.config.js` → `expo.scheme`
- `package.json` → `name`
- `android/settings.gradle` → `rootProject.name`
- README/title/docs references

### Native identifiers caution

Do not change these without explicit confirmation, especially if the app is already published:

- `app.config.js` → `android.package`
- `android/app/build.gradle` → `namespace` and `applicationId`
- Kotlin package paths under `android/app/src/main/java/`

Changing native IDs usually creates a new app for app stores and installed-device updates.
