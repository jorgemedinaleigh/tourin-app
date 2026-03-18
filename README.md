# Tourin Monorepo

Tourin is an Expo + React Native mobile app with a new AWS-backed backend in the same repository. The mobile app stays at the repository root. The backend and infrastructure live in dedicated top-level folders so the app can migrate away from Appwrite without splitting the codebase.

## Repo layout

```text
app/                   Expo Router screens
assets/                Images and icons
components/            Reusable UI and map components
constants/             Static data and colors
contexts/              Global React providers
hooks/                 Domain hooks used by the app
lib/                   Appwrite, PostHog, and AWS client helpers
utils/                 Shared frontend utilities
backend/               ASP.NET Core API, application logic, domain, infrastructure, tests
infra/                 AWS CDK infrastructure for Cognito, API Gateway, Lambda, Aurora, RDS Proxy, S3, CloudFront
```

## Current architecture

- Mobile client: Expo SDK 53, React Native 0.79, React 19, Expo Router
- Legacy backend: Appwrite remains available as a fallback while migration is in progress
- New backend: ASP.NET Core Minimal API on AWS Lambda
- Auth target: Amazon Cognito User Pools
- Data target: Aurora PostgreSQL Serverless v2 plus RDS Proxy
- Media target: Amazon S3 plus CloudFront

## Prerequisites

- Node.js 20+
- npm 10+
- .NET SDK 9.0.306
- Docker for `infra/` synth and deploy on Windows

## Mobile app

Install dependencies:

```bash
npm install
```

Run the app:

```bash
npm run start
```

Platform-specific commands:

```bash
npm run android
npm run ios
npm run web
```

### Mobile environment variables

`.env.example` defaults to `EXPO_PUBLIC_AUTH_PROVIDER=appwrite` and leaves the AWS migration values blank so the app stays on the documented Appwrite fallback until you intentionally populate every AWS setting and switch the provider to Cognito in your local `.env`.

Copy `.env.example` to `.env`, then fill in only the values you need:

```env
EXPO_PUBLIC_AUTH_PROVIDER=appwrite
EXPO_PUBLIC_API_BASE_URL=
EXPO_PUBLIC_AWS_REGION=
EXPO_PUBLIC_COGNITO_USER_POOL_ID=
EXPO_PUBLIC_COGNITO_USER_POOL_CLIENT_ID=
EXPO_PUBLIC_POSTHOG_API_KEY=phc_xxxxxxxxxxxxxxxxx
EXPO_PUBLIC_POSTHOG_HOST=https://us.i.posthog.com
```

## Backend

The backend solution lives under [backend/Tourin.Backend.sln](/c:/Jorge/tourin-app/backend/Tourin.Backend.sln).

Build it:

```bash
dotnet build backend/Tourin.Backend.sln
```

Run tests:

```bash
dotnet test backend/Tourin.Backend.sln
```

Run the API locally:

```bash
dotnet run --project backend/src/Tourin.Api/Tourin.Api.csproj
```

The local API defaults to the in-memory data store and development header authentication. Cognito and PostgreSQL are enabled through configuration when you deploy to AWS.

### Backend endpoints

- `GET /v1/me`
- `GET /v1/achievements`
- `GET /v1/passport`
- `GET /v1/leaderboard`
- `GET /v1/map/sites`
- `GET /v1/metro/stations`
- `POST /v1/visits/stamp`
- `POST /v1/profile/avatar/upload-url`
- `POST /v1/profile/avatar/complete`

## Infrastructure

The CDK app lives under [infra/src/Tourin.Infrastructure/Program.cs](/c:/Jorge/tourin-app/infra/src/Tourin.Infrastructure/Program.cs).

Synth the stack:

```bash
cd infra
dotnet run --project ./src/Tourin.Infrastructure/Tourin.Infrastructure.csproj
```

The stack creates:

- Cognito User Pool and app client
- API Gateway HTTP API with JWT authorizer
- Lambda function for the ASP.NET Core API
- Aurora PostgreSQL Serverless v2 cluster
- RDS Proxy
- Private S3 bucket for avatar uploads
- CloudFront distribution for public avatar delivery
- CloudWatch alarms for Lambda and API Gateway errors

### Infrastructure configuration

`infra/cdk.json` contains default values. Override them with CDK context or environment variables:

```bash
$env:TOURIN_ENVIRONMENT_NAME="dev"
$env:TOURIN_AWS_ACCOUNT="123456789012"
$env:TOURIN_AWS_REGION="us-east-1"
dotnet run --project ./src/Tourin.Infrastructure/Tourin.Infrastructure.csproj
```

### Deploy

Install the CDK CLI if needed:

```bash
npm install -g aws-cdk
```

Deploy from the `infra/` directory:

```bash
cd infra
cdk deploy --all --require-approval never
```

### AWS bootstrap helpers

The repo includes helper scripts for the first AWS dev rollout:

- [Setup-GitHubOidc.ps1](/c:/Jorge/tourin-app/infra/scripts/Setup-GitHubOidc.ps1)
- [Bootstrap-DevEnvironment.ps1](/c:/Jorge/tourin-app/infra/scripts/Bootstrap-DevEnvironment.ps1)
- [Get-StackOutputs.ps1](/c:/Jorge/tourin-app/infra/scripts/Get-StackOutputs.ps1)

Typical sequence:

```powershell
pwsh ./infra/scripts/Setup-GitHubOidc.ps1
pwsh ./infra/scripts/Bootstrap-DevEnvironment.ps1 -EnvironmentName dev -Region us-east-1
pwsh ./infra/scripts/Get-StackOutputs.ps1 -EnvironmentName dev
```

After `Setup-GitHubOidc.ps1` finishes, add the printed values to GitHub:

- Secret `AWS_ROLE_TO_ASSUME`
- Secret `AWS_ACCOUNT_ID`
- Variable `AWS_REGION=us-east-1`

## Heritage site import

The first AWS rollout requires importing `heritage_sites` from Appwrite into Aurora PostgreSQL before enabling Cognito/AWS mode in the app.

The importer lives under [Tourin.HeritageSiteImporter.csproj](/c:/Jorge/tourin-app/backend/tools/Tourin.HeritageSiteImporter/Tourin.HeritageSiteImporter.csproj).

Supported input formats:

- JSON array
- JSON object with `rows`, `documents`, `items`, or `data`
- CSV with matching headers

Expected fields:

- `$id`
- `name`
- `description`
- `latitude`
- `longitude`
- `stampRadius`
- `isFree`
- `stamp`
- `coverPhoto`
- `type`
- `subType`
- `location`
- `legalStatus`
- `comuna`
- `region`
- `route`
- `website`

Run a dry run:

```bash
dotnet run --project backend/tools/Tourin.HeritageSiteImporter/Tourin.HeritageSiteImporter.csproj -- --input C:\path\heritage_sites.json --dry-run
```

The dry run can validate the file structure without a database connection.

Run the import:

```bash
dotnet run --project backend/tools/Tourin.HeritageSiteImporter/Tourin.HeritageSiteImporter.csproj -- --input C:\path\heritage_sites.json --connection-string "Host=...;Port=5432;Database=tourin;Username=...;Password=..."
```

The importer applies EF migrations automatically before loading data and upserts by site ID, so repeated imports are safe for the dev rollout.

## CI

The repo uses separate GitHub Actions workflows for:

- Mobile validation
- Backend build and tests
- Infrastructure synth and manual deploy

Path filters keep mobile-only changes from triggering backend CI and keep the infrastructure flow isolated from the Expo workflow.
