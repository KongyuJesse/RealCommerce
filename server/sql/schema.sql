DROP MATERIALIZED VIEW IF EXISTS weekly_category_sales_snapshot CASCADE;
DROP VIEW IF EXISTS weekly_category_sales CASCADE;
DROP VIEW IF EXISTS price_history_insights CASCADE;
DROP VIEW IF EXISTS customer_value_insights CASCADE;
DROP VIEW IF EXISTS product_sales_rankings CASCADE;
DROP VIEW IF EXISTS inventory_reorder_status CASCADE;
DROP VIEW IF EXISTS latest_exchange_rates CASCADE;
DROP TABLE IF EXISTS shipment_events CASCADE;
DROP TABLE IF EXISTS order_status_events CASCADE;
DROP TABLE IF EXISTS product_reviews CASCADE;
DROP TABLE IF EXISTS wishlists CASCADE;
DROP TABLE IF EXISTS cart_items CASCADE;
DROP TABLE IF EXISTS carts CASCADE;
DROP TABLE IF EXISTS promotions CASCADE;
DROP TABLE IF EXISTS content_blocks CASCADE;
DROP TABLE IF EXISTS shipping_methods_catalog CASCADE;
DROP TABLE IF EXISTS payment_methods_catalog CASCADE;
DROP TABLE IF EXISTS platform_settings CASCADE;
DROP TABLE IF EXISTS customer_addresses CASCADE;
DROP TABLE IF EXISTS user_sessions CASCADE;
DROP TABLE IF EXISTS shipments CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS order_items CASCADE;
DROP TABLE IF EXISTS orders CASCADE;
DROP TABLE IF EXISTS reorder_requests CASCADE;
DROP TABLE IF EXISTS inventory CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS product_images CASCADE;
DROP TABLE IF EXISTS price_history CASCADE;
DROP TABLE IF EXISTS product_attribute_values CASCADE;
DROP TABLE IF EXISTS product_attributes CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS customers CASCADE;
DROP TABLE IF EXISTS customer_tiers CASCADE;
DROP TABLE IF EXISTS users CASCADE;
DROP TABLE IF EXISTS roles CASCADE;
DROP TABLE IF EXISTS admin_activity_logs CASCADE;
DROP TABLE IF EXISTS external_service_syncs CASCADE;
DROP TABLE IF EXISTS exchange_rates CASCADE;
DROP TABLE IF EXISTS currencies CASCADE;
DROP TABLE IF EXISTS password_reset_tokens CASCADE;

CREATE TABLE roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE users (
  id SERIAL PRIMARY KEY,
  role_id INTEGER NOT NULL REFERENCES roles(id),
  full_name VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE user_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token_hash VARCHAR(255) NOT NULL UNIQUE,
  user_agent TEXT,
  ip_address VARCHAR(80),
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_tiers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(50) NOT NULL UNIQUE,
  discount_rate NUMERIC(5, 2) NOT NULL DEFAULT 0,
  min_lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (min_lifetime_value >= 0),
  benefits TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE currencies (
  code CHAR(3) PRIMARY KEY,
  name VARCHAR(60) NOT NULL,
  symbol VARCHAR(10) NOT NULL,
  is_base BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE payment_methods_catalog (
  id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipping_methods_catalog (
  id VARCHAR(40) PRIMARY KEY,
  label VARCHAR(80) NOT NULL,
  description TEXT,
  base_amount NUMERIC(12, 2) NOT NULL CHECK (base_amount >= 0),
  eta_days INTEGER NOT NULL CHECK (eta_days > 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  sort_order INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE platform_settings (
  key VARCHAR(80) PRIMARY KEY,
  value_json JSONB NOT NULL DEFAULT 'null'::jsonb,
  description TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE content_blocks (
  id SERIAL PRIMARY KEY,
  block_type VARCHAR(40) NOT NULL,
  slug VARCHAR(120) NOT NULL UNIQUE,
  eyebrow VARCHAR(80),
  title VARCHAR(160) NOT NULL,
  body TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE categories (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(120) NOT NULL UNIQUE,
  description TEXT NOT NULL,
  hero_copy TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_attributes (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  display_name VARCHAR(100) NOT NULL,
  value_type VARCHAR(20) NOT NULL DEFAULT 'TEXT'
    CHECK (value_type IN ('TEXT', 'NUMBER', 'BOOLEAN')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE warehouses (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(120) NOT NULL,
  city VARCHAR(80) NOT NULL,
  country VARCHAR(80) NOT NULL,
  capacity_units INTEGER NOT NULL CHECK (capacity_units >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customers (
  id SERIAL PRIMARY KEY,
  user_id INTEGER UNIQUE REFERENCES users(id),
  tier_id INTEGER NOT NULL REFERENCES customer_tiers(id),
  lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (lifetime_value >= 0),
  company_name VARCHAR(120),
  first_name VARCHAR(80) NOT NULL,
  last_name VARCHAR(80) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  phone VARCHAR(40),
  city VARCHAR(80),
  country VARCHAR(80),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE products (
  id SERIAL PRIMARY KEY,
  category_id INTEGER NOT NULL REFERENCES categories(id),
  sku VARCHAR(50) NOT NULL UNIQUE,
  name VARCHAR(150) NOT NULL,
  slug VARCHAR(150) NOT NULL UNIQUE,
  short_description TEXT NOT NULL,
  long_description TEXT NOT NULL,
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'DRAFT', 'ARCHIVED')),
  is_featured BOOLEAN NOT NULL DEFAULT FALSE,
  launch_month VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE product_attribute_values (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  attribute_id INTEGER NOT NULL REFERENCES product_attributes(id) ON DELETE CASCADE,
  value_text VARCHAR(255) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, attribute_id)
);

CREATE TABLE price_history (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  previous_price NUMERIC(12, 2) CHECK (previous_price >= 0),
  new_price NUMERIC(12, 2) NOT NULL CHECK (new_price >= 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  change_source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
  note TEXT,
  changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE inventory (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
  reorder_point INTEGER NOT NULL DEFAULT 0 CHECK (reorder_point >= 0),
  safety_stock INTEGER NOT NULL DEFAULT 0 CHECK (safety_stock >= 0),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, warehouse_id)
);

CREATE TABLE reorder_requests (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  warehouse_id INTEGER NOT NULL REFERENCES warehouses(id) ON DELETE CASCADE,
  quantity_requested INTEGER NOT NULL CHECK (quantity_requested > 0),
  quantity_on_hand INTEGER NOT NULL CHECK (quantity_on_hand >= 0),
  reorder_point INTEGER NOT NULL CHECK (reorder_point >= 0),
  status VARCHAR(20) NOT NULL DEFAULT 'OPEN'
    CHECK (status IN ('OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED')),
  trigger_source VARCHAR(40) NOT NULL DEFAULT 'LOW_STOCK_TRIGGER',
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);

CREATE TABLE product_images (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id) ON DELETE CASCADE,
  storage_provider VARCHAR(20) NOT NULL DEFAULT 'gcs'
    CHECK (storage_provider IN ('gcs', 'external', 'seed')),
  bucket_name VARCHAR(120),
  object_path VARCHAR(255),
  public_url TEXT,
  source_url TEXT,
  mime_type VARCHAR(120),
  alt_text VARCHAR(255),
  width INTEGER,
  height INTEGER,
  file_size_bytes BIGINT,
  display_order INTEGER NOT NULL DEFAULT 0,
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  asset_status VARCHAR(20) NOT NULL DEFAULT 'READY'
    CHECK (asset_status IN ('PENDING', 'READY', 'FAILED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE customer_addresses (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  label VARCHAR(80) NOT NULL,
  recipient_name VARCHAR(120) NOT NULL,
  line1 VARCHAR(160) NOT NULL,
  line2 VARCHAR(160),
  city VARCHAR(80) NOT NULL,
  state_region VARCHAR(80),
  postal_code VARCHAR(30),
  country VARCHAR(80) NOT NULL,
  phone VARCHAR(40),
  is_default_shipping BOOLEAN NOT NULL DEFAULT FALSE,
  is_default_billing BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE promotions (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  title VARCHAR(120) NOT NULL,
  description TEXT NOT NULL,
  discount_type VARCHAR(20) NOT NULL
    CHECK (discount_type IN ('PERCENT', 'FIXED', 'SHIPPING')),
  discount_value NUMERIC(12, 2) NOT NULL CHECK (discount_value >= 0),
  minimum_order_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (minimum_order_amount >= 0),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  starts_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ends_at TIMESTAMPTZ NOT NULL DEFAULT NOW() + INTERVAL '180 days',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE carts (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE'
    CHECK (status IN ('ACTIVE', 'CONVERTED', 'ABANDONED')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE cart_items (
  id SERIAL PRIMARY KEY,
  cart_id INTEGER NOT NULL REFERENCES carts(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  original_unit_price NUMERIC(12, 2) NOT NULL CHECK (original_unit_price >= 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  discount_label VARCHAR(120),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (cart_id, product_id)
);

CREATE TABLE wishlists (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (customer_id, product_id)
);

CREATE TABLE product_reviews (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  title VARCHAR(120) NOT NULL,
  body TEXT NOT NULL,
  is_verified_purchase BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (product_id, customer_id)
);

CREATE TABLE orders (
  id SERIAL PRIMARY KEY,
  customer_id INTEGER NOT NULL REFERENCES customers(id),
  order_number VARCHAR(50) NOT NULL UNIQUE,
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  base_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate_to_base NUMERIC(12, 6) NOT NULL CHECK (exchange_rate_to_base > 0),
  order_status VARCHAR(20) NOT NULL
    CHECK (order_status IN ('PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED')),
  payment_method VARCHAR(40),
  shipping_method VARCHAR(40) NOT NULL DEFAULT 'standard',
  subtotal_amount NUMERIC(12, 2) NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount NUMERIC(12, 2) NOT NULL CHECK (total_amount >= 0),
  base_subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_subtotal_amount >= 0),
  base_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_discount_amount >= 0),
  base_shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_shipping_amount >= 0),
  base_tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_tax_amount >= 0),
  base_total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_total_amount >= 0),
  promo_code VARCHAR(40),
  shipping_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  billing_address JSONB NOT NULL DEFAULT '{}'::jsonb,
  notes TEXT,
  placed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  delivery_eta DATE
);

CREATE TABLE order_items (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  line_number INTEGER NOT NULL CHECK (line_number > 0),
  product_id INTEGER NOT NULL REFERENCES products(id),
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  base_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  exchange_rate_to_base NUMERIC(12, 6) NOT NULL CHECK (exchange_rate_to_base > 0),
  original_unit_price NUMERIC(12, 2) NOT NULL CHECK (original_unit_price >= 0),
  unit_price NUMERIC(12, 2) NOT NULL CHECK (unit_price >= 0),
  discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  base_original_unit_price NUMERIC(12, 2) NOT NULL CHECK (base_original_unit_price >= 0),
  base_unit_price NUMERIC(12, 2) NOT NULL CHECK (base_unit_price >= 0),
  base_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0 CHECK (base_discount_amount >= 0),
  discount_label VARCHAR(120),
  line_total NUMERIC(12, 2) NOT NULL CHECK (line_total >= 0),
  base_line_total NUMERIC(12, 2) NOT NULL CHECK (base_line_total >= 0),
  UNIQUE (order_id, line_number)
);

CREATE TABLE payments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  provider VARCHAR(60) NOT NULL,
  payment_method VARCHAR(40) NOT NULL,
  amount NUMERIC(12, 2) NOT NULL CHECK (amount >= 0),
  payment_status VARCHAR(20) NOT NULL
    CHECK (payment_status IN ('PENDING', 'AUTHORIZED', 'CAPTURED', 'FAILED', 'REFUNDED')),
  paid_at TIMESTAMPTZ,
  transaction_reference VARCHAR(80) UNIQUE
);

CREATE TABLE shipments (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL UNIQUE REFERENCES orders(id) ON DELETE CASCADE,
  warehouse_id INTEGER REFERENCES warehouses(id),
  carrier VARCHAR(60) NOT NULL,
  service_level VARCHAR(60),
  shipment_status VARCHAR(20) NOT NULL
    CHECK (shipment_status IN ('PENDING', 'PICKING', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED')),
  tracking_number VARCHAR(80) UNIQUE,
  tracking_url TEXT,
  last_known_location VARCHAR(120),
  last_event_at TIMESTAMPTZ,
  estimated_delivery_at TIMESTAMPTZ,
  shipped_at TIMESTAMPTZ,
  delivered_at TIMESTAMPTZ
);

CREATE TABLE order_status_events (
  id SERIAL PRIMARY KEY,
  order_id INTEGER NOT NULL REFERENCES orders(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  note TEXT,
  actor_role VARCHAR(50),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE shipment_events (
  id SERIAL PRIMARY KEY,
  shipment_id INTEGER NOT NULL REFERENCES shipments(id) ON DELETE CASCADE,
  status VARCHAR(20) NOT NULL,
  event_code VARCHAR(40) NOT NULL DEFAULT 'STATUS_UPDATE',
  location VARCHAR(120),
  note TEXT,
  is_public BOOLEAN NOT NULL DEFAULT TRUE,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  event_time TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE exchange_rates (
  id SERIAL PRIMARY KEY,
  base_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  target_currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
  rate NUMERIC(12, 6) NOT NULL CHECK (rate > 0),
  effective_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE (base_currency_code, target_currency_code, effective_at)
);

CREATE TABLE external_service_syncs (
  id SERIAL PRIMARY KEY,
  service_name VARCHAR(80) NOT NULL,
  provider VARCHAR(80) NOT NULL,
  trigger VARCHAR(40) NOT NULL DEFAULT 'manual',
  status VARCHAR(20) NOT NULL
    CHECK (status IN ('SUCCESS', 'FAILED', 'SKIPPED')),
  summary TEXT,
  details JSONB NOT NULL DEFAULT '{}'::jsonb,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE password_reset_tokens (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash VARCHAR(255) NOT NULL UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_password_reset_tokens_user ON password_reset_tokens(user_id);
CREATE INDEX idx_password_reset_tokens_expires ON password_reset_tokens(expires_at);

CREATE TABLE admin_activity_logs (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  actor_role VARCHAR(50),
  action VARCHAR(80) NOT NULL,
  entity_type VARCHAR(80) NOT NULL,
  entity_id VARCHAR(120),
  summary TEXT NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE OR REPLACE FUNCTION refresh_customer_lifetime_and_tier(target_customer_id INTEGER)
RETURNS VOID AS $$
DECLARE
  resolved_lifetime NUMERIC(12, 2);
  resolved_tier_id INTEGER;
BEGIN
  IF target_customer_id IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(base_total_amount), 0)
  INTO resolved_lifetime
  FROM orders
  WHERE customer_id = target_customer_id
    AND order_status IN ('PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED');

  UPDATE customers
  SET lifetime_value = COALESCE(resolved_lifetime, 0)
  WHERE id = target_customer_id;

  SELECT id
  INTO resolved_tier_id
  FROM customer_tiers
  WHERE min_lifetime_value <= COALESCE(resolved_lifetime, 0)
  ORDER BY min_lifetime_value DESC, id DESC
  LIMIT 1;

  IF resolved_tier_id IS NOT NULL THEN
    UPDATE customers
    SET tier_id = resolved_tier_id
    WHERE id = target_customer_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION sync_customer_metrics_from_orders()
RETURNS TRIGGER AS $$
BEGIN
  PERFORM refresh_customer_lifetime_and_tier(COALESCE(NEW.customer_id, OLD.customer_id));
  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION create_reorder_request_if_needed()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.quantity_on_hand > NEW.reorder_point THEN
    RETURN NEW;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM reorder_requests
    WHERE product_id = NEW.product_id
      AND warehouse_id = NEW.warehouse_id
      AND status = 'OPEN'
  ) THEN
    RETURN NEW;
  END IF;

  INSERT INTO reorder_requests (
    product_id,
    warehouse_id,
    quantity_requested,
    quantity_on_hand,
    reorder_point,
    status,
    trigger_source,
    note
  )
  VALUES (
    NEW.product_id,
    NEW.warehouse_id,
    GREATEST((NEW.reorder_point + NEW.safety_stock) - NEW.quantity_on_hand, 1),
    NEW.quantity_on_hand,
    NEW.reorder_point,
    'OPEN',
    'LOW_STOCK_TRIGGER',
    'Automatically generated because inventory dropped below the reorder point.'
  );

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION record_product_price_history()
RETURNS TRIGGER AS $$
BEGIN
  IF OLD.unit_price IS DISTINCT FROM NEW.unit_price
    OR OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
    INSERT INTO price_history (
      product_id,
      previous_price,
      new_price,
      currency_code,
      change_source,
      note,
      changed_at
    )
    VALUES (
      NEW.id,
      OLD.unit_price,
      NEW.unit_price,
      NEW.currency_code,
      'CATALOG_UPDATE',
      CASE
        WHEN OLD.currency_code IS DISTINCT FROM NEW.currency_code THEN
          CONCAT('Currency changed from ', OLD.currency_code, ' to ', NEW.currency_code, '.')
        ELSE 'Product price updated from catalog management.'
      END,
      NOW()
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_orders_refresh_customer_metrics
AFTER INSERT OR UPDATE OF customer_id, order_status, base_total_amount OR DELETE
ON orders
FOR EACH ROW
EXECUTE FUNCTION sync_customer_metrics_from_orders();

CREATE TRIGGER trg_inventory_auto_reorder
AFTER INSERT OR UPDATE OF quantity_on_hand, reorder_point, safety_stock
ON inventory
FOR EACH ROW
EXECUTE FUNCTION create_reorder_request_if_needed();

CREATE TRIGGER trg_products_price_history
AFTER UPDATE OF unit_price, currency_code
ON products
FOR EACH ROW
EXECUTE FUNCTION record_product_price_history();

CREATE VIEW latest_exchange_rates AS
SELECT DISTINCT ON (base_currency_code, target_currency_code)
  base_currency_code,
  target_currency_code,
  rate,
  effective_at
FROM exchange_rates
ORDER BY base_currency_code, target_currency_code, effective_at DESC, id DESC;

CREATE VIEW inventory_reorder_status AS
SELECT
  i.id AS inventory_id,
  i.product_id,
  p.name AS product_name,
  i.warehouse_id,
  w.name AS warehouse_name,
  i.quantity_on_hand,
  i.reorder_point,
  i.safety_stock,
  (i.quantity_on_hand <= i.reorder_point) AS needs_reorder,
  COALESCE(open_requests.open_request_count, 0) AS open_reorder_requests
FROM inventory i
JOIN products p ON p.id = i.product_id
JOIN warehouses w ON w.id = i.warehouse_id
LEFT JOIN LATERAL (
  SELECT COUNT(*)::integer AS open_request_count
  FROM reorder_requests rr
  WHERE rr.product_id = i.product_id
    AND rr.warehouse_id = i.warehouse_id
    AND rr.status = 'OPEN'
) open_requests ON TRUE;

CREATE VIEW product_sales_rankings AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  p.id AS product_id,
  p.name AS product_name,
  COALESCE(SUM(CASE WHEN o.order_status IN ('PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED') THEN oi.quantity ELSE 0 END), 0)::integer AS total_sold,
  RANK() OVER (
    PARTITION BY c.id
    ORDER BY COALESCE(SUM(CASE WHEN o.order_status IN ('PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED') THEN oi.quantity ELSE 0 END), 0) DESC, p.id ASC
  ) AS rank_in_category,
  DENSE_RANK() OVER (
    PARTITION BY c.id
    ORDER BY COALESCE(SUM(CASE WHEN o.order_status IN ('PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED') THEN oi.quantity ELSE 0 END), 0) DESC, p.id ASC
  ) AS dense_rank_in_category
FROM products p
JOIN categories c ON c.id = p.category_id
LEFT JOIN order_items oi ON oi.product_id = p.id
LEFT JOIN orders o ON o.id = oi.order_id
GROUP BY c.id, c.name, p.id, p.name;

CREATE VIEW customer_value_insights AS
SELECT
  c.id AS customer_id,
  CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
  c.email,
  c.company_name,
  c.lifetime_value,
  ct.id AS tier_id,
  ct.name AS tier_name,
  ct.discount_rate,
  RANK() OVER (PARTITION BY ct.id ORDER BY c.lifetime_value DESC, c.id ASC) AS rank_in_tier,
  DENSE_RANK() OVER (ORDER BY c.lifetime_value DESC, c.id ASC) AS dense_rank_overall,
  NTILE(10) OVER (ORDER BY c.lifetime_value DESC, c.id ASC) AS lifetime_value_decile
FROM customers c
JOIN customer_tiers ct ON ct.id = c.tier_id;

CREATE VIEW price_history_insights AS
SELECT
  ph.id,
  ph.product_id,
  p.name AS product_name,
  ph.currency_code,
  ph.previous_price,
  ph.new_price,
  ph.change_source,
  ph.note,
  ph.changed_at,
  LAG(ph.new_price, 1) OVER (PARTITION BY ph.product_id ORDER BY ph.changed_at, ph.id) AS lag_price,
  LEAD(ph.new_price, 1) OVER (PARTITION BY ph.product_id ORDER BY ph.changed_at, ph.id) AS next_price,
  ph.new_price - LAG(ph.new_price, 1) OVER (PARTITION BY ph.product_id ORDER BY ph.changed_at, ph.id) AS price_change,
  FIRST_VALUE(ph.new_price) OVER (
    PARTITION BY ph.product_id
    ORDER BY ph.changed_at, ph.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS first_price,
  LAST_VALUE(ph.new_price) OVER (
    PARTITION BY ph.product_id
    ORDER BY ph.changed_at, ph.id
    ROWS BETWEEN UNBOUNDED PRECEDING AND UNBOUNDED FOLLOWING
  ) AS latest_price
FROM price_history ph
JOIN products p ON p.id = ph.product_id;

CREATE VIEW weekly_category_sales AS
SELECT
  c.id AS category_id,
  c.name AS category_name,
  DATE_TRUNC('week', o.placed_at) AS week_start,
  TO_CHAR(DATE_TRUNC('week', o.placed_at), 'IYYY-IW') AS year_week,
  SUM(oi.base_line_total)::numeric(12, 2) AS total_revenue_usd,
  SUM(oi.quantity)::integer AS units_sold,
  COUNT(DISTINCT o.id)::integer AS order_count
FROM orders o
JOIN order_items oi ON oi.order_id = o.id
JOIN products p ON p.id = oi.product_id
JOIN categories c ON c.id = p.category_id
WHERE o.order_status IN ('PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED')
GROUP BY c.id, c.name, DATE_TRUNC('week', o.placed_at);

CREATE MATERIALIZED VIEW weekly_category_sales_snapshot AS
SELECT *
FROM weekly_category_sales
WITH NO DATA;

CREATE INDEX idx_users_role_id ON users(role_id);
CREATE INDEX idx_user_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_content_blocks_type_order ON content_blocks(block_type, sort_order);
CREATE INDEX idx_products_category_id ON products(category_id);
CREATE INDEX idx_products_status_featured_created ON products(status, is_featured, created_at DESC);
CREATE INDEX idx_product_images_product_id
  ON product_images(product_id, is_primary DESC, display_order ASC);
CREATE INDEX idx_price_history_product_changed_at ON price_history(product_id, changed_at DESC);
CREATE INDEX idx_inventory_product_id ON inventory(product_id);
CREATE INDEX idx_inventory_warehouse_id ON inventory(warehouse_id);
CREATE INDEX idx_reorder_requests_product_status
  ON reorder_requests(product_id, warehouse_id, status, created_at DESC);
CREATE INDEX idx_customer_addresses_customer_id ON customer_addresses(customer_id);
CREATE INDEX idx_customers_lifetime_value ON customers(lifetime_value DESC);
CREATE UNIQUE INDEX idx_carts_active_customer ON carts(customer_id) WHERE status = 'ACTIVE';
CREATE INDEX idx_cart_items_product_id ON cart_items(product_id);
CREATE INDEX idx_wishlists_customer ON wishlists(customer_id, added_at DESC);
CREATE INDEX idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX idx_orders_customer_id ON orders(customer_id);
CREATE INDEX idx_orders_status ON orders(order_status);
CREATE INDEX idx_orders_placed_at ON orders(placed_at DESC);
CREATE INDEX idx_orders_reporting_base_total
  ON orders(base_currency_code, placed_at DESC, base_total_amount DESC);
CREATE INDEX idx_order_items_order_id ON order_items(order_id);
CREATE INDEX idx_order_items_product_rankings
  ON order_items(product_id, base_line_total DESC, quantity DESC);
CREATE INDEX idx_shipments_status_eta ON shipments(shipment_status, estimated_delivery_at, last_event_at DESC);
CREATE INDEX idx_order_status_events_order_id ON order_status_events(order_id, created_at DESC);
CREATE INDEX idx_shipment_events_shipment_id ON shipment_events(shipment_id, event_time DESC);
CREATE INDEX idx_shipment_events_visibility ON shipment_events(shipment_id, is_public, event_time DESC);
CREATE INDEX idx_exchange_rates_lookup
  ON exchange_rates(base_currency_code, target_currency_code, effective_at DESC);
CREATE INDEX idx_external_service_syncs_lookup
  ON external_service_syncs(service_name, started_at DESC, id DESC);
CREATE INDEX idx_admin_activity_logs_created_at
  ON admin_activity_logs(created_at DESC, id DESC);
CREATE INDEX idx_admin_activity_logs_entity
  ON admin_activity_logs(entity_type, entity_id, created_at DESC);
CREATE UNIQUE INDEX idx_reorder_requests_open_unique
  ON reorder_requests(product_id, warehouse_id)
  WHERE status = 'OPEN';
CREATE INDEX idx_weekly_category_sales_snapshot_lookup
  ON weekly_category_sales_snapshot(week_start DESC, category_id);
