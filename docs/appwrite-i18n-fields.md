# Appwrite i18n Fields

The client now supports localized Appwrite content with this fallback order:

1. `*_{{activeLocale}}`
2. `*_es`
3. legacy unsuffixed field

## User prefs

- `account.prefs.locale`
  - Supported values: `es`, `en`, `pt`

## `routes`

- `name_es`, `name_en`, `name_pt`
- `description_es`, `description_en`, `description_pt`
- `bestTime_es`, `bestTime_en`, `bestTime_pt`
- `intensity_es`, `intensity_en`, `intensity_pt`
- `tags_es`, `tags_en`, `tags_pt`

## `heritage_sites`

- `routeId`
  - Should reference the route row `$id`
- `name_es`, `name_en`, `name_pt`
- `description_es`, `description_en`, `description_pt`
- `subType_es`, `subType_en`, `subType_pt`
- Optional if map chips should also be localized without a route lookup:
  - `route_es`, `route_en`, `route_pt`

## `achivements`

- `name_es`, `name_en`, `name_pt`
- `description_es`, `description_en`, `description_pt`
- `criteria_es`, `criteria_en`, `criteria_pt`

## Legacy compatibility

- `heritage_sites.route` is still read as a fallback join key while data is migrated to `routeId`.
- Existing unsuffixed fields still render if localized fields are missing.
