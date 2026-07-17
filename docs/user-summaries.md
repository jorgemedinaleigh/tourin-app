# Exploration statistics

Tourin exposes exploration history as live, aggregated statistics instead of generating active-day and weekly recap cards.

## User flow

The profile screen has one **View exploration summary** action. It opens the statistics screen, where the user can select one of these rolling periods:

- Last day: previous 24 hours
- Last week: previous 7 days
- Last month: previous 30 days
- All history: every recorded activity

The screen displays aggregate counts for visited places, completed routes, unlocked achievements, active days, and free places. It also includes exploration streaks, average places per active day, geographic and category diversity, category distribution, route completion, exploration habits, and overall place and achievement progress.

## Data flow

- A successful `site_visits` insert records the device IANA time zone and local activity date used by the statistics system.
- A database trigger records a route completion when a stamp completes every published stop.
- `get_my_exploration_stats` aggregates the authenticated user's raw visits, achievement unlocks, and route completions for the selected rolling period.
- The statistics are calculated on demand and are not stored as snapshots.
- Localized category and region values are resolved by the client using the active app locale and the standard fallback order.

Apply the migrations before shipping the statistics screen:

```bash
supabase db push
```

## Notifications

Summary notifications are no longer scheduled. Previously scheduled summary notifications are cancelled for the authenticated user when the updated app starts.

## Sharing

The existing recap sharing implementation remains in `app/dashboard/summaryScreen.jsx` for reference and future reuse. Sharing is not yet available from the exploration statistics screen.
