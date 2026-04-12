# Appwrite i18n Fields

The client now supports localized Appwrite content with this fallback order:

1. `*_{{activeLocale}}`
2. `*_es`
3. legacy unsuffixed field

## User prefs

- `account.prefs.locale`
  - Supported values: `es`, `en`

## `routes`

- `name_es`, `name_en`
- `description_es`, `description_en`
- `bestTime_es`, `bestTime_en`
- `intensity_es`, `intensity_en`
- `tags_es`, `tags_en`

## `heritage_sites`

- `routeId`
  - Should reference the route row `$id`
- `name_es`, `name_en`
- `description_es`, `description_en`
- `subType_es`, `subType_en`
- Optional if map chips should also be localized without a route lookup:
  - `route_es`, `route_en`

## `achivements`

- `name_es`, `name_en`
- `description_es`, `description_en`
- `criteria_es`, `criteria_en`

## Legacy compatibility

- `heritage_sites.route` is still read as a fallback join key while data is migrated to `routeId`.
- Existing unsuffixed fields still render if localized fields are missing.
