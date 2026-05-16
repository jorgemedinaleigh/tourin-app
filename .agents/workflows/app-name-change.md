# App Name Change Workflow

Use this checklist when the user wants to rename the app.

## Display name only

Update:

- `app.config.js` → `expo.name`
- `android/app/src/main/res/values/strings.xml` → `app_name`

Then rebuild/reinstall the app.

## Project slug/package naming

If the user also wants project identifiers changed, consider:

- `app.config.js` → `expo.slug`
- `app.config.js` → `expo.scheme`
- `package.json` → `name`
- `android/settings.gradle` → `rootProject.name`
- README/title/docs references

## Native identifiers caution

Do not change these without explicit confirmation, especially if the app is already published:

- `app.config.js` → `android.package`
- `android/app/build.gradle` → `namespace` and `applicationId`
- Kotlin package paths under `android/app/src/main/java/`

Changing native IDs usually creates a new app for app stores and installed-device updates.
