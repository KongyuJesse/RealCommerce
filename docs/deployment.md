# Deployment Guide

This repository supports two production layouts:

1. Render Blueprint for both frontend and API
2. Vercel for the frontend plus Render for the API

## Option 1: Render Blueprint

Use the root [render.yaml](../render.yaml) to create:

- `realcommerce-api` as a Node web service from `server/`
- `realcommerce-web` as a static site from `client/`

### Blueprint setup

1. Push the repository to GitHub.
2. In Render, create a new Blueprint from the repo.
3. Provide values for these required env vars when prompted:

- `DATABASE_URL`
- `SESSION_SECRET`

4. Add optional values as needed:

- `CLIENT_ORIGIN_REGEX`
- `GCS_PROJECT_ID`
- `GCS_BUCKET_NAME`
- `GCS_KEY_FILENAME`
- `GCS_CREDENTIALS_JSON`
- `GCS_CREDENTIALS_BASE64`
- `GCS_PUBLIC_BASE_URL`
- `RESEND_API_KEY`
- `SMTP_HOST`
- `SMTP_PORT`
- `SMTP_USER`
- `SMTP_PASS`

### How the services are wired

- The frontend build receives `REACT_APP_API_BASE_URL` from the API service's `RENDER_EXTERNAL_URL`.
- The API receives `CLIENT_ORIGIN` from the frontend service's `RENDER_EXTERNAL_URL`.
- Frontend product/media URLs are resolved against `REACT_APP_API_BASE_URL`, which is important when the frontend and API are on different domains.
- The Blueprint also creates a generated `REALCOMMERCE_SESSION_SECRET` fallback so existing services with a blank `SESSION_SECRET` do not fail startup after sync.

### Render notes

- `DATABASE_URL` can point to Render Postgres or any other reachable PostgreSQL instance.
- If you use an external Postgres URL that requires SSL, keep `PGSSL=true`.
- If you use an internal Render Postgres connection string, set `PGSSL=false`.
- If the target database is brand new and empty, the API now bootstraps the base schema and seed data automatically on first startup before applying upgrades.
- If the target database is partially initialized or manually modified, fix that schema manually instead of relying on automatic bootstrap, because the app intentionally refuses destructive recovery in that state.

## Option 2: Vercel Frontend + Render API

### Frontend

- Root directory: `client`
- Framework: Create React App
- Build command: `npm run build`
- Output directory: `build`
- Config file: [client/vercel.json](../client/vercel.json)

Required frontend env var:

- `REACT_APP_API_BASE_URL=https://your-api-origin`

### API

- Root directory: `server`
- Runtime: Node
- Build command: `npm install`
- Start command: `npm start`
- Health check path: `/api/ready`

Required API env vars:

- `DATABASE_URL`
- `SESSION_SECRET`
- `CLIENT_ORIGIN=https://your-frontend-origin`

Common API env vars:

- `CLIENT_ORIGIN_REGEX`
- `PGSSL`
- `GCS_*`
- `RESEND_API_KEY`
- `SMTP_*`

## Environment Files

Local templates are provided here:

- [client/.env.example](../client/.env.example)
- [server/.env.example](../server/.env.example)

## Verification Checklist

Run locally before deploying:

```bash
npm run verify
```

Then verify in the deployed environment:

- `GET /api/health`
- `GET /api/ready`
- customer registration and login
- catalog and product detail pages
- product images in catalog, product detail, cart, checkout, and comparison UI
- staff portal login and dashboard loading
- order tracking against the deployed API
