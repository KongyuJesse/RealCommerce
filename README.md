# RealCommerce

RealCommerce is a production-oriented single-seller commerce platform with a React storefront, an Express API, PostgreSQL-backed operations data, and role-based staff tooling.

## Highlights

- Single-seller marketplace model with customer and staff experiences
- React storefront in `client/`
- Express 5 API in `server/`
- PostgreSQL schema and seed data in `server/sql/`
- Role-specific operational workflows for catalog, inventory, orders, finance, support, and shipping
- Wishlist, checkout, order tracking, analytics, audit logging, and exchange-rate sync
- Deployment-ready `render.yaml` for a static frontend plus API service
- Frontend media resolution that works when the frontend and API are deployed on different domains

## Stack

- Frontend: React 19, Create React App
- Backend: Node.js, Express 5, PostgreSQL
- Infra: Render Blueprint for the frontend and API, optional Vercel for the frontend
- Storage: external image URLs or Google Cloud Storage signed uploads

## Repository Layout

- `client/` React storefront
- `server/` Express API, database access, services, and SQL
- `docs/deployment.md` deployment guide
- `render.yaml` Render Blueprint for `realcommerce-web` and `realcommerce-api`

## Local Development

1. Install dependencies:
   `npm install`
   `npm run install:all`
2. Copy env templates:
   `client/.env.example` -> `client/.env`
   `server/.env.example` -> `server/.env`
3. Update `server/.env` with your PostgreSQL credentials and a local `SESSION_SECRET`.
4. Create the database named in `PGDATABASE`.
5. Initialize the schema and seed data:
   `npm run db:init`
6. Start both services:
   `npm run dev`

On a brand-new production database, the API now bootstraps the base schema and seed data automatically on first startup before applying incremental upgrades.

Local defaults:

- Frontend: `http://localhost:3000`
- API: `http://localhost:4000`

If `REACT_APP_API_BASE_URL` is empty, the CRA proxy in `client/package.json` is used in local development.

## Scripts

- `npm run dev` starts frontend and backend
- `npm run build` builds the frontend
- `npm run test` runs the frontend test suite
- `npm run db:init` creates and seeds the database
- `npm run seed:admin` creates or updates the platform admin account
- `npm run verify` runs tests, frontend build, and server smoke validation

## Demo Accounts

All seeded demo accounts use:
`RealCommerce!2026`

Staff:

- `jesse@realcommerce.com` admin
- `ada@realcommerce.com` inventory manager
- `maya@realcommerce.com` order manager
- `tunde@realcommerce.com` customer support
- `amara@realcommerce.com` marketing manager
- `chen@realcommerce.com` finance manager
- `sarah@realcommerce.com` catalog manager
- `david@realcommerce.com` shipping coordinator

Customers:

- `lionel@bluehorizon.com`
- `sofia@vitaretail.com`

## Deployment

### Render Blueprint

The included [render.yaml](render.yaml) provisions:

- `realcommerce-api` as a Node web service
- `realcommerce-web` as a static frontend

Set these required values in Render during Blueprint setup:

- `DATABASE_URL`

One strong session secret is required in production:

- `SESSION_SECRET`
- or `REALCOMMERCE_SESSION_SECRET`

Optional but commonly needed:

- `CLIENT_ORIGIN_REGEX`
- `GCS_*` media storage variables
- `RESEND_API_KEY` or `SMTP_*` email variables
- `SEED_ADMIN_EMAIL` and `SEED_ADMIN_PASSWORD` if you plan to run `npm run seed:admin`

The Blueprint wires the static site and API together from each service's Render external URL. It also creates a generated `REALCOMMERCE_SESSION_SECRET` fallback for existing Render services where `SESSION_SECRET` is blank or missing.

For a fresh empty Postgres database, the API boot process now initializes the base schema and demo/reference seed data automatically before running startup migrations. Existing databases still use the normal incremental upgrade path.

### Vercel + Render

If you prefer Vercel for the frontend:

- deploy `client/` with [client/vercel.json](client/vercel.json)
- set `REACT_APP_API_BASE_URL` to your API origin
- set API `CLIENT_ORIGIN` to the deployed frontend origin

More detail lives in [docs/deployment.md](docs/deployment.md).

## Images and Media

- Product cards, product detail galleries, cart items, checkout items, and comparison views now resolve API-backed media against `REACT_APP_API_BASE_URL`.
- Broken or missing product images fall back to [client/public/images/placeholder.svg](client/public/images/placeholder.svg).
- Catalog managers can still attach external image URLs immediately.
- Google Cloud Storage uploads remain supported through signed upload URLs when storage variables are configured.

## Verification

Before pushing deployment changes, run:

```bash
npm run verify
```

Recommended smoke checks after deployment:

- `GET /api/health`
- `GET /api/ready`
- browse catalog and product detail pages
- confirm product images render in catalog, cart, checkout, and comparison views
- confirm staff portal and order tracking work against the deployed API origin
