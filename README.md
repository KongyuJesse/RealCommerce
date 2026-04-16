# RealCommerce

RealCommerce is a split deployment workspace with:

- `client/`: a React storefront intended for Vercel
- `server/`: an Express + PostgreSQL API intended for Render

The repo is now set up for production-oriented delivery with:

- env-driven frontend/backend deployment config
- professional API request logging with request IDs
- hardened cookie, CORS, Helmet, and rate-limit defaults
- role-aware admin and customer workspaces with separate dashboard capabilities
- warehouse management, user management, reorder workflows, and wishlist support
- hourly external exchange-rate synchronization with audit visibility
- staff activity audit logging across platform, catalog, warehouse, and fulfillment actions
- GitHub Actions CI for test, build, and server smoke checks
- deployment-ready env templates in `client/.env.example` and `server/.env.example`

## Local setup

1. Install root dependencies with `npm install`.
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
- `npm run verify`

Client:

- `npm start`
- `npm run build`
- `npm run test:ci`

Server:

- `npm run dev`
- `npm start`
- `npm run db:init`
- `npm run db:migrate:shipping`
- `npm run smoke`

## API highlights

- `GET /api/health`
- `GET /api/ready`
- `GET /api/storage/status`
- `GET /api/bootstrap`
- `GET /api/homepage`
- `GET /api/lookups`
- `GET /api/categories`
- `GET /api/products`
- `GET /api/products/:slug`
- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/session`
- `GET /api/cart`
- `POST /api/cart/items`
- `PATCH /api/cart/items/:itemId`
- `DELETE /api/cart/items/:itemId`
- `POST /api/checkout/quote`
- `POST /api/checkout/complete`
- `GET /api/dashboard/customer`
- `GET /api/dashboard/admin`
- `GET /api/dashboard/operations`
- `POST /api/account/addresses`
- `PATCH /api/account/profile`
- `DELETE /api/account/addresses/:id`
- `POST /api/reviews`
- `GET /api/orders/:orderNumber`
- `GET /api/tracking/shipments/:trackingNumber`
- `GET /api/analytics`
- `GET /api/analytics/inventory-health`
- `GET /api/wishlist`
- `POST /api/wishlist`
- `DELETE /api/wishlist/:productId`
- `POST /api/wishlist/:productId/move-to-cart`
- `POST /api/admin/products`
- `POST /api/admin/discounts`
- `GET /api/admin/users`
- `POST /api/admin/users`
- `PATCH /api/admin/users/:userId`
- `GET /api/admin/warehouses`
- `POST /api/admin/warehouses`
- `PATCH /api/admin/warehouses/:warehouseId`
- `GET /api/admin/activity`
- `POST /api/admin/reorder-requests`
- `PATCH /api/admin/reorder-requests/:requestId/status`
- `GET /api/admin/integrations/exchange-rates`
- `POST /api/admin/integrations/exchange-rates/sync`
- `PATCH /api/admin/orders/:orderId/status`
- `PATCH /api/admin/shipments/:shipmentId/status`
- `POST /api/admin/shipments/:shipmentId/events`
- `PUT /api/admin/platform-settings`
- `POST /api/uploads/product-images/sign`
- `POST /api/uploads/product-images/:imageId/complete`

## Authentication notes

- Self-service registration is currently customer-only.
- Order tracking requires an authenticated session.
- Admin, merchandising, and operations routes are role-protected on the API.
- Customer sessions now receive personalized dashboard data, wishlist preview, loyalty progress, and recommended products.
- Staff workspaces now surface an activity feed for operational auditability.

## Deployment

Deployment steps and required environment variables are documented in [docs/deployment.md](docs/deployment.md).
