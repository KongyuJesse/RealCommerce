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
- Health check path: `/api/health`

### Required backend environment variables

Set these in Render:

- `NODE_ENV=production`
- `API_PREFIX=/api`
- `CLIENT_ORIGIN=https://your-frontend-domain.vercel.app`
- `DATABASE_URL=your-render-postgres-connection-string`
- `PGSSL=true`

### Optional backend environment variables

Use these when needed:

- `CLIENT_ORIGIN_REGEX=^https://your-project-name-.*\\.vercel\\.app$`
  This allows Vercel preview deployments.
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

The frontend will use this for `/api/homepage` in production. If the variable is empty in local development, CRA falls back to the local proxy in `client/package.json`.

## Cross-service connection checklist

1. Deploy the Render backend first and copy its public URL.
2. Set `REACT_APP_API_BASE_URL` in Vercel to that Render URL.
3. Set `CLIENT_ORIGIN` in Render to the Vercel production URL.
4. Redeploy both services after updating env vars.
5. Verify:
   - backend health: `https://your-render-api.onrender.com/api/health`
   - frontend loads and displays API-backed homepage content

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
  `PGPASSWORD=your_password_here`
  `PGDATABASE=realcommerce`

## Verification

Before deploying, run:

```bash
npm run build
cd client && node node_modules/react-scripts/bin/react-scripts.js test --watchAll=false --runInBand
```
