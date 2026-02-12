# PostHog post-wizard report

The wizard has completed a deep integration of PostHog analytics into your tourin-app Expo project. This integration provides comprehensive event tracking for user authentication, heritage site visits, achievements, and map interactions. The setup includes:

- **PostHog SDK Configuration**: Created `lib/posthog.js` with optimized settings for React Native including batching, feature flags, and lifecycle event capture.
- **Environment Variables**: Configured `.env` with `EXPO_PUBLIC_POSTHOG_API_KEY` and `EXPO_PUBLIC_POSTHOG_HOST` for secure credential management.
- **App Configuration**: Created `app.config.js` to expose PostHog credentials via `expo-constants`.
- **PostHog Provider**: Wrapped the app with `PostHogProvider` in `app/_layout.jsx` with manual screen tracking for Expo Router and autocapture for touch events.
- **User Identification**: Implemented `posthog.identify()` on login/signup and `posthog.reset()` on logout in the UserContext.
- **Event Tracking**: Added 13 custom events across authentication, site visits, achievements, and map interactions.
- **Error Tracking**: Implemented `$exception` capture for login, signup, and stamp failures.

## Events Implemented

| Event Name | Description | File Path |
|------------|-------------|-----------|
| `user_signed_up` | Fired when a user successfully registers a new account | `contexts/UserContext.jsx` |
| `user_logged_in` | Fired when a user successfully logs into their account | `contexts/UserContext.jsx` |
| `user_logged_out` | Fired when a user logs out of their account | `contexts/UserContext.jsx` |
| `login_failed` | Fired when a login attempt fails with error details | `app/auth/loginScreen.jsx` |
| `signup_failed` | Fired when a registration attempt fails with error details | `app/auth/registerScreen.jsx` |
| `site_stamped` | Fired when a user stamps a visit to a heritage site - key conversion event | `components/InfoCard.jsx` |
| `stamp_failed` | Fired when a stamp attempt fails (location denied, too far away, or error) | `components/InfoCard.jsx` |
| `site_info_viewed` | Fired when a user opens the info card for a heritage site | `app/dashboard/mapScreen.jsx` |
| `metro_info_viewed` | Fired when a user opens info card for a metro station | `app/dashboard/mapScreen.jsx` |
| `achievement_unlocked` | Fired when a user unlocks an achievement - key engagement event | `hooks/useAchievements.js` |
| `achievement_viewed` | Fired when a user views an achievement badge in full screen | `app/dashboard/achievementsScreen.jsx` |
| `external_website_clicked` | Fired when a user clicks through to an external website from a site info card | `components/InfoCard.jsx` |
| `location_centered` | Fired when a user centers the map on their current location | `app/dashboard/mapScreen.jsx` |

## Next steps

We've built some insights and a dashboard for you to keep an eye on user behavior, based on the events we just instrumented:

### Dashboard
- **Analytics basics**: [https://us.posthog.com/project/312155/dashboard/1274679](https://us.posthog.com/project/312155/dashboard/1274679)

### Insights
- **User Signups & Logins Over Time**: [https://us.posthog.com/project/312155/insights/0e1jWNl0](https://us.posthog.com/project/312155/insights/0e1jWNl0)
- **Site Visit Funnel** (site_info_viewed → site_stamped): [https://us.posthog.com/project/312155/insights/eCLRNcOL](https://us.posthog.com/project/312155/insights/eCLRNcOL)
- **Stamp Failures by Reason**: [https://us.posthog.com/project/312155/insights/qvL1w4PA](https://us.posthog.com/project/312155/insights/qvL1w4PA)
- **User Engagement Actions**: [https://us.posthog.com/project/312155/insights/SP5uSXqC](https://us.posthog.com/project/312155/insights/SP5uSXqC)
- **Auth Failure Rates**: [https://us.posthog.com/project/312155/insights/cM9mxBqy](https://us.posthog.com/project/312155/insights/cM9mxBqy)

### Agent skill

We've left an agent skill folder in your project at `.claude/skills/posthog-integration-expo/`. You can use this context for further agent development when using Claude Code. This will help ensure the model provides the most up-to-date approaches for integrating PostHog.
