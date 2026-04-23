# Migration to Single-Seller Platform

## Overview
This platform has been transformed from a multi-seller marketplace to a single-seller e-commerce platform similar to Amazon's structure, where the admin/company manages all products and multiple specialized staff roles handle different aspects of the business.

## Key Changes

### 1. Removed Seller/Marketplace Logic
- **Removed Tables**: `seller_profiles`, `seller_discount_campaigns`
- **Removed Columns**: `seller_profile_id` from products table
- **Impact**: Products are now managed directly by the platform admin and catalog managers

### 2. New Role Structure (Amazon-like)

#### Staff Roles:
1. **admin** - Full platform access, system configuration, user management
2. **inventory_manager** - Warehouse operations, stock levels, reorder workflows
3. **order_manager** - Order processing, fulfillment, order-related issues
4. **customer_support** - Customer inquiries, returns, account issues
5. **marketing_manager** - Promotions, campaigns, content, customer engagement
6. **finance_manager** - Pricing, payments, refunds, financial reporting
7. **catalog_manager** - Product catalog, descriptions, images, categories
8. **shipping_coordinator** - Shipment coordination, delivery tracking, carrier management

#### Customer Role:
9. **customer** - Browse, order, review products, manage account

### 3. Role-Based Dashboards

Each staff role now has access to specific dashboards:
- `/api/dashboard/admin` - Admin overview (admin only)
- `/api/dashboard/inventory` - Inventory management (inventory_manager, admin)
- `/api/dashboard/orders` - Order management (order_manager, admin)
- `/api/dashboard/support` - Customer support (customer_support, admin)
- `/api/dashboard/marketing` - Marketing campaigns (marketing_manager, admin)
- `/api/dashboard/finance` - Financial overview (finance_manager, admin)
- `/api/dashboard/catalog` - Catalog management (catalog_manager, admin)
- `/api/dashboard/shipping` - Shipping coordination (shipping_coordinator, admin)
- `/api/dashboard/customer` - Customer account (customer only)

### 4. Updated API Permissions

#### Catalog Management:
- `POST /api/admin/products` - admin, catalog_manager, marketing_manager
- `POST /api/admin/discounts` - admin, marketing_manager, finance_manager
- `POST /api/admin/products/:productId/images` - admin, catalog_manager, marketing_manager

#### Inventory Management:
- `GET /api/admin/warehouses` - admin, inventory_manager
- `POST /api/admin/warehouses` - admin, inventory_manager
- `PATCH /api/admin/warehouses/:warehouseId` - admin, inventory_manager
- `POST /api/admin/reorder-requests` - admin, inventory_manager
- `PATCH /api/admin/reorder-requests/:requestId/status` - admin, inventory_manager

#### Order & Shipping Management:
- `PATCH /api/admin/orders/:orderId/status` - admin, order_manager
- `GET /api/admin/shipments` - admin, shipping_coordinator, order_manager
- `PATCH /api/admin/shipments/:shipmentId/status` - admin, shipping_coordinator, order_manager
- `POST /api/admin/shipments/:shipmentId/events` - admin, shipping_coordinator, order_manager

#### Finance & Settings:
- `POST /api/admin/integrations/exchange-rates/sync` - admin, finance_manager
- `PUT /api/admin/platform-settings` - admin only

#### Analytics:
- All staff roles can access analytics endpoints

### 5. Database Schema Changes

#### Products Table:
```sql
-- REMOVED: seller_profile_id column
-- Products are now platform-owned

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  -- ... other fields
);
```

#### Orders Table:
```sql
-- REMOVED: seller_discount_amount, tier_discount_amount, promo_discount_amount
-- SIMPLIFIED: Single discount_amount field

CREATE TABLE orders (
  -- ... other fields
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  base_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0,
  -- ... other fields
);
```

### 6. Seed Data Updates

New staff users (all use password: `RealCommerce!2026`):
- jesse@realcommerce.com - Admin
- ada@realcommerce.com - Inventory Manager
- maya@realcommerce.com - Order Manager
- tunde@realcommerce.com - Customer Support
- amara@realcommerce.com - Marketing Manager
- chen@realcommerce.com - Finance Manager
- sarah@realcommerce.com - Catalog Manager
- david@realcommerce.com - Shipping Coordinator

### 7. Service Layer Changes

#### admin-service.js:
- Updated `MANAGED_ROLE_NAMES` to include all new roles
- All user management functions support new roles

#### auth-service.js:
- Removed seller profile lookups from session queries
- Simplified session user object

#### commerce-service.js:
- Removed all seller-specific discount logic
- Updated `resolveSessionCapabilities` for new roles
- Removed seller profile references from bootstrap

#### API routes (api.js):
- Comprehensive role-based access control
- New dashboard endpoints for each role
- Updated permission checks across all endpoints

## Migration Steps

### For Existing Deployments:

1. **Backup Database**
   ```bash
   pg_dump realcommerce > backup_before_migration.sql
   ```

2. **Run Migration Script**
   ```bash
   npm run db:migrate:single-seller
   ```

3. **Update Environment Variables**
   - No changes required to `.env` files

4. **Restart Services**
   ```bash
   npm run server:start
   ```

5. **Verify Migration**
   - Test login with new staff roles
   - Verify dashboard access
   - Check product catalog (no seller references)
   - Test order flow

### For New Deployments:

1. **Initialize Database**
   ```bash
   npm run db:init
   ```

2. **Start Services**
   ```bash
   npm run dev
   ```

## Breaking Changes

### API Responses:
- Removed `seller_profile_id`, `store_name`, `seller_slug` from product responses
- Removed `sellerProfileId` from session object
- Simplified discount structure in orders

### Frontend Updates Needed:
- Remove seller profile pages/components
- Update product cards to remove seller information
- Update dashboards for new role structure
- Add new staff dashboard components

## Testing Checklist

- [ ] Admin can create products without seller profile
- [ ] Inventory manager can manage warehouses
- [ ] Order manager can process orders
- [ ] Customer support can view customer data
- [ ] Marketing manager can create campaigns
- [ ] Finance manager can manage pricing
- [ ] Catalog manager can update products
- [ ] Shipping coordinator can track shipments
- [ ] Customers can browse and purchase
- [ ] All role-based permissions work correctly
- [ ] Analytics accessible to all staff
- [ ] No seller references in UI/API responses

## Rollback Plan

If issues arise:
```bash
psql realcommerce < backup_before_migration.sql
git checkout previous-version
npm run server:start
```

## Support

For questions or issues during migration, refer to:
- Database schema: `server/sql/schema.sql`
- Seed data: `server/sql/seed.sql`
- API routes: `server/routes/api.js`
- Role definitions: `server/services/admin-service.js`
