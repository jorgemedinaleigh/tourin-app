# User summaries and notifications

Tourin supports live active-day recaps and finalized Monday–Sunday weekly recaps.

## Data flow

- A successful `site_visits` insert records the awarded score, device IANA time zone, and local activity date.
- A database trigger records a route completion when the new stamp completes every published stop.
- `get_or_create_my_summary` aggregates stamps, achievements, and route completions into `user_summaries`.
- Active-day rows remain `draft` during the activity day and update when requested. Closed days and weeks are `final` snapshots.
- Clients can only read their summaries. Engagement timestamps are updated through owner-scoped RPC functions.

Apply migrations before shipping an app build that writes `activity_timezone`:

```bash
supabase db push
```

## Local notifications

Recap reminders are scheduled directly on the device with `expo-notifications`. They do not require Firebase, FCM, APNs, push tokens, an Edge Function, or a Supabase cron job.

After adding `expo-notifications`, create and install a new native build; an over-the-air JavaScript update is not sufficient.

Scheduled notification identifiers are stored in AsyncStorage per user. A new stamp refreshes the current active-day and weekly schedules, and saving notification preferences reschedules pending reminders at the selected times.

## Notification behavior

- Active-day: the following local day at the user's configured time; default `09:00`.
- Weekly: Monday at the user's configured time; default `10:00`.
- No notification is scheduled for an empty period.
- Notification taps deep-link to `/dashboard/summaryScreen` using its period type and start date. The finalized summary is generated on demand.
- Pending recap notifications are cancelled during logout.
- Local schedules do not synchronize across devices and are removed when the app is uninstalled.

## Sharing and privacy

The recap screen creates a vertical 9:16 image with `react-native-view-shot` and opens the native share sheet with `expo-sharing`.

General region display is optional and disabled by default. Exact coordinates are never placed in a summary payload or share card.
