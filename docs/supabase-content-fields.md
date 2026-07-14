# Supabase Content Fields

The client supports localized Supabase content with this exact fallback order implemented by `getLocalizedField`:

1. Legacy suffixed field for active locale, for example `name_en`
2. Legacy suffixed field for fallback locale (`options.fallbackLocale` or `DEFAULT_LOCALE`)
3. JSON value for active locale, for example `name.en`
4. JSON value for fallback locale
5. JSON value for `DEFAULT_LOCALE`
6. JSON value for `es`
7. JSON value for `en`
8. JSON value for `pt`
9. Legacy unsuffixed scalar field, for example `name`
10. `options.defaultValue` (only if all previous candidates are empty)

`getLocalizedField` treats `null`, `undefined`, empty strings, and empty arrays as empty values and continues with the next fallback candidate.

## Minimal resolution example

Given:

- `locale = 'en'`
- `fallbackLocale = 'es'`
- `row = {`
  - `name_en: ''`
  - `name_es: 'Nombre legado ES'`
  - `name: { en: 'Name JSON EN', es: 'Nombre JSON ES' }`
  - `}`

Result: `getLocalizedField(row, 'name', 'en', { fallbackLocale: 'es' })` returns **`'Nombre legado ES'`** because `name_en` is empty and `name_es` is evaluated before JSON localized values.

## User Preferences

- `profiles.locale`
  - Supported values: `es`, `en`, `pt`
- `profiles.avatar_path`
  - Optional Storage path for future profile images
- `profiles.country_code`
  - Optional ISO 3166-1 alpha-2 country code used for profile display
- `profiles.subdivision_code`
  - Optional ISO 3166-2 principal subdivision code associated with the residence country
  - Required during new registrations when `country_code` is `CL`; existing Chilean profiles may remain null until edited
- `profiles.exploration_modes`
  - Existing profiles may be null; new registrations and profile-detail updates require at least one value
  - Supported values: `solo`, `couple`, `family`, `friends`, and `work_or_study`
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
- `rule_type` stores the machine-readable evaluator name. Supported client rule types are:
  - `manual` — visible in the app but not auto-unlocked.
  - `route_completed` — unlocks when all published sites for a route are stamped.
  - `site_count_by_attribute` — unlocks when stamped published sites matching an attribute reach a target.
- `rule_config` stores evaluator-specific JSONB:
  - `route_completed`: `{ "routeId": "<route id>" }`
  - `site_count_by_attribute`: `{ "siteField": "sub_type", "siteValues": ["museum"], "target": 5 }`
- `site_count_by_attribute.siteField` supports `type`, `sub_type`, `route_id`, `region`, `comuna`, and `is_free`.
- Existing rows without a rule should use `manual` and `{}`.
