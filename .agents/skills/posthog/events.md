# PostHog Event Inventory

This inventory is based on current source references to `posthog.capture(...)`.

| Event | Purpose | Primary file(s) |
|---|---|---|
| `user_signed_up` | Successful registration | `contexts/UserContext.jsx` |
| `user_logged_in` | Successful login | `contexts/UserContext.jsx` |
| `user_logged_out` | Logout action | `contexts/UserContext.jsx` |
| `login_failed` | Failed login attempt | `app/auth/loginScreen.jsx` |
| `signup_failed` | Failed registration attempt | `app/auth/registerScreen.jsx` |
| `site_info_viewed` | User opens a heritage-site info card | `app/dashboard/mapScreen.jsx` |
| `metro_info_viewed` | User opens a metro-station info card | `app/dashboard/mapScreen.jsx` |
| `location_centered` | User centers map on current location | `app/dashboard/mapScreen.jsx` |
| `site_stamped` | Successful site stamp / visit conversion | `components/InfoCard.jsx` |
| `stamp_failed` | Failed stamp attempt | `components/InfoCard.jsx` |
| `external_website_clicked` | User opens a site website | `components/InfoCard.jsx` |
| `site_directions_opened` | User opens directions for a site | `components/InfoCard.jsx` |
| `route_maps_opened` | User opens route navigation/maps | `app/dashboard/routeDetails.jsx` |
| `achievement_unlocked` | Achievement unlock | `hooks/useAchievements.js` |
| `achievement_viewed` | User opens an achievement badge/detail | `app/dashboard/achievementsScreen.jsx` |
| `$exception` | Captured exception in critical flows | `app/auth/*`, `components/InfoCard.jsx` |

## Naming convention

- Custom product events use lowercase `snake_case`.
- Use past-tense action names for completed actions: `site_stamped`, `achievement_unlocked`.
- Use `_failed` suffix for recoverable user-flow failures.
