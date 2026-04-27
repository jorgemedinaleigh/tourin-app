# Supabase Content Fields

The client supports localized Supabase content with this fallback order:

1. JSON value for the active locale, for example `name.en`
2. JSON value for the fallback locale, currently `name.es`
3. Legacy suffixed fields, if present during import, for example `name_en`
4. Legacy unsuffixed fields, if present during import

## User Preferences

- `profiles.locale`
  - Supported values: `es`, `en`, `pt`
- `profiles.avatar_path`
  - Optional Storage path for future profile images
- `profiles.country_code`
  - Optional ISO 3166-1 alpha-2 country code used for profile display
- `user_private_details.date_of_birth`
  - Required for new registrations and kept in an owner-readable private table

## `routes`

- `name`, `description`, `best_time`, `intensity`, and `tags` are localized JSONB values.
- `distance`, `time_to_complete`, `icon`, and `color` are scalar route metadata.

## `heritage_sites`

- `route_id` references `routes.id`.
- `name`, `description`, and `sub_type` are localized JSONB values.
- `cover_photo_path` and `stamp_path` store paths in the public `content` Storage bucket.
- `latitude`, `longitude`, `score`, `stamp_radius`, and `stop_order` drive map and stamp behavior.

## `achievements`

- `name`, `description`, and `criteria` are localized JSONB values.
- `badge_path` stores a path in the public `content` Storage bucket.
