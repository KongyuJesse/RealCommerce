# Deployment Guide

This project is prepared for:

- backend deployment on Render
- frontend deployment on Vercel

## Architecture

- Render hosts the Express API from `server/`
- Vercel hosts the React storefront from `client/`
- Vercel connects to Render through `REACT_APP_API_BASE_URL`
- Render allows the Vercel domain through `CLIENT_ORIGIN`

## Backend on Render

### Files already prepared

- `render.yaml`
- `server/.env.example`

### Render service settings

- Service type: `Web Service`
- Root directory: `server`
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/ready`

### Required backend environment variables

Set these in Render:

- `NODE_ENV=production`
- `APP_NAME=realcommerce-api`
- `API_PREFIX=/api`
- `TRUST_PROXY=1`
- `LOG_LEVEL=info`
- `LOG_FORMAT=json`
- `CLIENT_ORIGIN=https://your-frontend-domain.vercel.app`
- `DATABASE_URL=your-render-postgres-connection-string`
- `SESSION_SECRET=replace-with-a-long-random-secret`
- `SESSION_COOKIE_SECURE=true`
- `SESSION_COOKIE_SAME_SITE=None`
- `PGSSL=true`

### Recommended backend environment variables

- `CLIENT_ORIGIN_REGEX=^https://your-project-name-.*\\.vercel\\.app$`
  This allows Vercel preview deployments.
- `GLOBAL_RATE_LIMIT_WINDOW_MS=900000`
- `GLOBAL_RATE_LIMIT_MAX_REQUESTS=300`
- `AUTH_RATE_LIMIT_WINDOW_MS=600000`
- `AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS=8`
- `AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS=4`
- `DB_POOL_MAX=10`
- `DB_IDLE_TIMEOUT_MS=30000`
- `DB_CONNECTION_TIMEOUT_MS=10000`
- `DB_STATEMENT_TIMEOUT_MS=15000`
- `DB_QUERY_TIMEOUT_MS=15000`
- `TAX_RATE=0.075`
- `FREE_SHIPPING_THRESHOLD=1200`
- `EXCHANGE_RATE_PROVIDER=frankfurter`
- `EXCHANGE_RATE_PROVIDER_BASE_URL=https://api.frankfurter.app`
- `EXCHANGE_RATE_SYNC_ENABLED=true`
- `EXCHANGE_RATE_SYNC_INTERVAL_MS=3600000`
- `EXCHANGE_RATE_SYNC_TIMEOUT_MS=10000`

### Optional media storage variables

- `MEDIA_STORAGE_PROVIDER=gcs`
- `GCS_PROJECT_ID=your-google-cloud-project-id`
- `GCS_BUCKET_NAME=your-google-cloud-storage-bucket`
- `GCS_PUBLIC_BASE_URL=https://storage.googleapis.com/your-bucket`

For Google Cloud credentials on Render, prefer one of these:

- `GCS_CREDENTIALS_JSON`
  Paste the full service-account JSON as a single secret value.
- `GCS_CREDENTIALS_BASE64`
  Base64-encoded service-account JSON.

Keep `GCS_KEY_FILENAME` for local development or file-mounted environments only.

In production, do not leave `SESSION_SECRET` on the development default. The API refuses to boot until a real secret is configured.

## Frontend on Vercel

### Files already prepared

- `client/vercel.json`
- `client/.env.example`

### Vercel project settings

- Framework preset: `Create React App`
- Root directory: `client`
- Build command: `npm run build`
- Output directory: `build`

### Required frontend environment variables

Set this in Vercel:

- `REACT_APP_API_BASE_URL=https://your-render-api.onrender.com`

If the variable is empty in local development, CRA falls back to the local proxy in `client/package.json`.

## Cross-service connection checklist

1. Deploy the Render backend first and copy its public URL.
2. Set `REACT_APP_API_BASE_URL` in Vercel to that Render URL.
3. Set `CLIENT_ORIGIN` in Render to the Vercel production URL.
4. Redeploy both services after updating env vars.
5. Verify:
   - backend health: `https://your-render-api.onrender.com/api/health`
   - backend readiness: `https://your-render-api.onrender.com/api/ready`
   - backend storage status: `https://your-render-api.onrender.com/api/storage/status`
   - admin exchange-rate sync status: `https://your-render-api.onrender.com/api/admin/integrations/exchange-rates`
   - admin activity feed: `https://your-render-api.onrender.com/api/admin/activity`
   - frontend loads and displays API-backed homepage content
   - customer registration and login succeed
   - admin and customer dashboards load role-specific tabs and actions

## Local env files

Frontend:

- copy `client/.env.example` to `client/.env`

Backend:

- copy `server/.env.example` to `server/.env`

Recommended local values:

- `client/.env`
  `REACT_APP_API_BASE_URL=http://localhost:4000`
- `server/.env`
  `CLIENT_ORIGIN=http://localhost:3000`
  `PGHOST=localhost`
  `PGPORT=5432`
  `PGUSER=postgres`
  `PGPASSWORD=your_real_password_here`
  `PGDATABASE=realcommerce`
  `SESSION_SECRET=replace_me_for_local_dev`

## Verification

Before deploying, run:

```bash
npm run verify
```
