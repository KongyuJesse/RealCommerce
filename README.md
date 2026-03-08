# RealCommerce

RealCommerce is now structured as a real split application:

- `client/`: standalone React frontend
- `server/`: standalone Express and PostgreSQL backend
- root package: orchestration scripts for running both together

The platform includes:

- a PostgreSQL schema for roles, users, customers, tiers, products, categories, attributes, currencies, warehouses, inventory, orders, payments, and shipments
- an Express API with homepage, catalog, and health endpoints
- a production-style homepage that reads live API data and falls back gracefully when the API is unavailable
- backend-local environment management in `server/.env`

## API endpoints

- `GET /api/health`
- `GET /api/homepage`
- `GET /api/categories`
- `GET /api/products`

## Local setup

1. Install root orchestration dependencies with `npm install`.
2. Install the frontend dependencies with `npm install --prefix client`.
3. Install the backend dependencies with `npm install --prefix server`.
4. Review `server/.env` or copy `server/.env.example` if you need different PostgreSQL settings.
5. Initialize the database with `npm run db:init`.
6. Start both apps with `npm run dev`.

Frontend runs on `http://localhost:3000`.
Backend runs on `http://localhost:4000`.

## Scripts

- Root:
- `npm run dev`: run frontend and backend together
- `npm run client`: run only the frontend package
- `npm run server`: run only the backend package in dev mode
- `npm run server:start`: run the backend package in production mode
- `npm run build`: build the frontend package
- `npm run test`: run the frontend tests once
- `npm run db:init`: create and seed the PostgreSQL database
- Client:
- `npm start`
- `npm run build`
- `npm run test:ci`
- Server:
- `npm run dev`
- `npm start`
- `npm run db:init`

## Current status

- The `realcommerce` PostgreSQL database has been created locally and seeded successfully.
- The backend package serves `/api/health` and `/api/homepage` successfully.
- The client package builds and tests successfully on its own.
