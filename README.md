# RealCommerce

RealCommerce is split into two deployable applications:

- `client/`: React storefront intended for Vercel
- `server/`: Express + PostgreSQL API intended for Render

The project now includes production deployment wiring for both sides:

- env-driven frontend API base URL for Vercel
- env-driven backend CORS rules for Vercel domains
- Render blueprint config in `render.yaml`
- Vercel project config in `client/vercel.json`
- deployment env templates in `client/.env.example` and `server/.env.example`
- Render-friendly Google Cloud Storage credential support from env variables

## Local setup

1. Install root orchestration dependencies with `npm install`.
2. Install frontend dependencies with `npm install --prefix client`.
3. Install backend dependencies with `npm install --prefix server`.
4. Copy `client/.env.example` to `client/.env` if you want an explicit frontend API URL.
5. Copy `server/.env.example` to `server/.env` and fill in your PostgreSQL settings.
6. Initialize the database with `npm run db:init`.
7. Start both apps with `npm run dev`.

Local defaults:

- frontend: `http://localhost:3000`
- backend: `http://localhost:4000`

## Scripts

Root:

- `npm run dev`
- `npm run client`
- `npm run server`
- `npm run server:start`
- `npm run build`
- `npm run test`
- `npm run db:init`

Client:

- `npm start`
- `npm run build`
- `npm run test:ci`

Server:

- `npm run dev`
- `npm start`
- `npm run db:init`

## API endpoints

- `GET /api/health`
- `GET /api/homepage`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:productId/images`
- `POST /api/uploads/product-images/sign`
- `POST /api/uploads/product-images/:imageId/complete`

## Deployment

Deployment steps and required environment variables are documented in [docs/deployment.md](docs/deployment.md).
