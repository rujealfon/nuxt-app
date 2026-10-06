# Deployment

Run this guide when configuring Vercel or deploying production. For candidate
promotion and hotfixes, also follow [Release workflow](releases.md#release-workflow).

All four apps deploy to Vercel as separate projects, one per subdomain.
Each app ships a `vercel.json`; Nitro auto-selects the `vercel` preset when
`VERCEL=1`.

For every project:

1. Create a Vercel project and set **Root Directory** to `apps/<name>`.
2. Enable **Include source files outside of the Root Directory in the Build
   Step** (needed for the `packages/*` workspace layers).
3. Set the framework preset to Nuxt. Only `apps/admin/vercel.json` currently
   pins `iad1`; the other apps leave region selection to Vercel. Configure the
   API's region to match your database deployment.

## Manual production deployment

The deployment job runs only when `VERCEL_DEPLOYMENT_ENABLED=true`. With that
repository variable unset or set to another value, manual runs verify CI and
publish a GitHub release and tag if the commits warrant a version bump. A release
in this mode does not indicate a live deployment. After completing Vercel setup,
set the repository variable to `true` to require all four deployments before
publishing.

Merging into `main` runs CI. Production deployment is a separate manual action in
[`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml).
The workflow implements the deployment gate and calls
[semantic-release](releases.md) for publishing.

Each app disables Vercel Git deployments from `main` using
[`git.deploymentEnabled`](https://vercel.com/docs/project-configuration/git-configuration).
Other branches retain automatic preview deployments. Set the Vercel Production
Branch to `main` for each project so another branch cannot auto-deploy production.

Before the first manual deployment, configure GitHub's `production` environment
in Settings, Environments. Restrict its deployment branches to `main`.
Add these settings there, or as repository secrets and variables:

| Kind | Name | Value |
| --- | --- | --- |
| Secret | `VERCEL_TOKEN` | Vercel token with access to the four projects |
| Variable | `VERCEL_ORG_ID` | Vercel team ID, or account ID for personal projects |
| Variable | `VERCEL_PROJECT_ID_API` | Project ID for `apps/api` |
| Variable | `VERCEL_PROJECT_ID_WEB` | Project ID for `apps/web` |
| Variable | `VERCEL_PROJECT_ID_APP` | Project ID for `apps/app` |
| Variable | `VERCEL_PROJECT_ID_ADMIN` | Project ID for `apps/admin` |

Find each project ID and the team ID in Vercel settings or its linked
`.vercel/project.json`. Keep the application environment variables in Vercel;
the workflow uses each project's production build settings. Confirm the project
IDs belong to this repository and each project's Root Directory is `apps/<name>`.

To deploy:

1. Wait for the `main` CI run to succeed.
2. In Actions, select Deploy production, then Run workflow. Select `main` and
   start the run. The workflow must be merged into the default branch before GitHub shows
   the manual trigger. See [GitHub's manual workflow guide](https://docs.github.com/actions/managing-workflow-runs/manually-running-a-workflow).
3. The workflow checks the latest push CI run for the exact selected commit. It
   rejects other branches and commits whose CI is pending or unsuccessful.
4. It uploads the workspace and deploys `api`, `web`, `app`, then `admin`, building
   remotely on Vercel. Deployment URLs appear in the job summary. Concurrent
   production runs are serialized, and an active deployment is not canceled.
5. After all four apps deploy, or after verification in release-only mode, the
   release job publishes a version tag and GitHub release if the commits warrant
   one. Commits such as `ci`, `docs`, and `chore` normally produce no release.
   Failed verification, failed deployments, and canceled runs skip publishing.

Deployments across the four projects are sequential and are not atomic. A failure
stops the remaining deployments; earlier successful deployments stay live.
Check the summary before retrying or rolling back a project in Vercel.
If publishing fails after deployment, the deployed apps remain live. Re-run
failed jobs to retry publishing while `main` still points to the selected commit.
If `main` advances during the workflow, publishing stops instead of tagging newer
changes. Wait for the latest commit's CI and start a new manual run.
This workflow builds production deployments from the selected commit; it does
not promote the existing staging/UAT build artifacts or run database migrations.

## Environment variables

Set these public origins for every frontend. The example uses production
hostnames; use the matching preview or candidate origins in other environments:

```dotenv
NUXT_PUBLIC_WEB_URL=https://web.nuxt-app.com
NUXT_PUBLIC_APP_URL=https://app.nuxt-app.com
NUXT_PUBLIC_ADMIN_URL=https://admin.nuxt-app.com
```

App and admin also configure the API client:

```dotenv
NUXT_PUBLIC_API_BASE=https://api.nuxt-app.com
NUXT_PUBLIC_API_VERSION=v1          # optional; defaults to the current version
```

Set server-only values for the API in each environment:

```dotenv
DATABASE_URL=postgresql://...@ep-xxx-pooler.<region>.aws.neon.tech/neondb?sslmode=require
DATABASE_DRIVER=neon
BETTER_AUTH_URL=https://api.nuxt-app.com
BETTER_AUTH_SECRET=            # openssl rand -base64 32
REDIS_URL=rediss://default:password@host:port
CORS_ORIGINS=https://web.nuxt-app.com,https://app.nuxt-app.com,https://admin.nuxt-app.com
```

## Database and auth origins

Configure Postgres and Redis using [Managed services](database.md#managed-services).
Apply [migrations](database.md#migrations) separately; this workflow does not run
them. Postgres stores auth sessions and Redis stores rate-limit counters.

Set `BETTER_AUTH_URL` to the API public origin. `CORS_ORIGINS` must list the
frontend origins and also supplies Better Auth's trusted origins. Browser apps
use HttpOnly cookies, so keep them on same-site domains. Add each subdomain to
its Vercel project and configure its DNS records.
For native clients, follow [bearer setup](api-client.md#native-capacitor-app).
