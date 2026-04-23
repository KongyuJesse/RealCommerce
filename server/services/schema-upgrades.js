const { pool } = require('../db');
const { ensureDatabaseBootstrapped } = require('./database-bootstrap-service');

const SCHEMA_LOCK_ID = 681245901;

const schemaUpgradeStatements = [
  `
    CREATE TABLE IF NOT EXISTS platform_settings (
      key VARCHAR(80) PRIMARY KEY,
      value_json JSONB NOT NULL DEFAULT 'null'::jsonb,
      description TEXT,
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,

  `
    CREATE TABLE IF NOT EXISTS external_service_syncs (
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
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS admin_activity_logs (
      id SERIAL PRIMARY KEY,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_role VARCHAR(50),
      action VARCHAR(80) NOT NULL,
      entity_type VARCHAR(80) NOT NULL,
      entity_id VARCHAR(120),
      summary TEXT NOT NULL,
      metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS price_history (
      id SERIAL PRIMARY KEY,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      previous_price NUMERIC(12, 2) CHECK (previous_price >= 0),
      new_price NUMERIC(12, 2) NOT NULL CHECK (new_price >= 0),
      currency_code CHAR(3) NOT NULL REFERENCES currencies(code),
      change_source VARCHAR(40) NOT NULL DEFAULT 'MANUAL',
      note TEXT,
      changed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `,
  `
    CREATE TABLE IF NOT EXISTS reorder_requests (
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
    )
  `,
  `
    ALTER TABLE customer_tiers
    ADD COLUMN IF NOT EXISTS min_lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    UPDATE customer_tiers
    SET min_lifetime_value = CASE
      WHEN LOWER(name) = 'starter' THEN 0
      WHEN LOWER(name) = 'growth' THEN 450
      WHEN LOWER(name) = 'scale' THEN 1200
      WHEN LOWER(name) = 'enterprise' THEN 1700
      ELSE COALESCE(min_lifetime_value, 0)
    END
  `,
  `
    ALTER TABLE customers
    ADD COLUMN IF NOT EXISTS lifetime_value NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS seller_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS tier_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS promo_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_currency_code CHAR(3) REFERENCES currencies(code)
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS exchange_rate_to_base NUMERIC(12, 6)
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_subtotal_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_seller_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_tier_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_promo_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_shipping_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_tax_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE orders
    ADD COLUMN IF NOT EXISTS base_total_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    UPDATE orders
    SET
      base_currency_code = COALESCE(
        base_currency_code,
        (SELECT code FROM currencies WHERE is_base = TRUE ORDER BY code ASC LIMIT 1),
        currency_code
      ),
      exchange_rate_to_base = COALESCE(exchange_rate_to_base, 1),
      base_subtotal_amount = CASE WHEN base_subtotal_amount = 0 THEN subtotal_amount ELSE base_subtotal_amount END,
      base_seller_discount_amount = CASE WHEN base_seller_discount_amount = 0 THEN seller_discount_amount ELSE base_seller_discount_amount END,
      base_tier_discount_amount = CASE WHEN base_tier_discount_amount = 0 THEN tier_discount_amount ELSE base_tier_discount_amount END,
      base_promo_discount_amount = CASE WHEN base_promo_discount_amount = 0 THEN promo_discount_amount ELSE base_promo_discount_amount END,
      base_discount_amount = CASE WHEN base_discount_amount = 0 THEN discount_amount ELSE base_discount_amount END,
      base_shipping_amount = CASE WHEN base_shipping_amount = 0 THEN shipping_amount ELSE base_shipping_amount END,
      base_tax_amount = CASE WHEN base_tax_amount = 0 THEN tax_amount ELSE base_tax_amount END,
      base_total_amount = CASE WHEN base_total_amount = 0 THEN total_amount ELSE base_total_amount END
    WHERE
      base_currency_code IS NULL
      OR exchange_rate_to_base IS NULL
      OR base_subtotal_amount = 0
      OR base_total_amount = 0
  `,
  `
    ALTER TABLE orders
    ALTER COLUMN base_currency_code SET NOT NULL
  `,
  `
    ALTER TABLE orders
    ALTER COLUMN exchange_rate_to_base SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS original_unit_price NUMERIC(12, 2)
  `,
  `
    ALTER TABLE cart_items
    ADD COLUMN IF NOT EXISTS currency_code CHAR(3) REFERENCES currencies(code)
  `,
  `
    UPDATE cart_items ci
    SET currency_code = COALESCE(ci.currency_code, p.currency_code)
    FROM products p
    WHERE p.id = ci.product_id
      AND ci.currency_code IS NULL
  `,
  `
    ALTER TABLE cart_items
    ALTER COLUMN currency_code SET NOT NULL
  `,
  `
    CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (customer_id, product_id)
    )
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS discount_label VARCHAR(120)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS line_number INTEGER
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS currency_code CHAR(3) REFERENCES currencies(code)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS base_currency_code CHAR(3) REFERENCES currencies(code)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS exchange_rate_to_base NUMERIC(12, 6)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS base_original_unit_price NUMERIC(12, 2)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS base_unit_price NUMERIC(12, 2)
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS base_discount_amount NUMERIC(12, 2) NOT NULL DEFAULT 0
  `,
  `
    ALTER TABLE order_items
    ADD COLUMN IF NOT EXISTS base_line_total NUMERIC(12, 2)
  `,
  `
    UPDATE order_items
    SET original_unit_price = unit_price
    WHERE original_unit_price IS NULL
  `,
  `
    WITH ranked AS (
      SELECT id, ROW_NUMBER() OVER (PARTITION BY order_id ORDER BY id ASC) AS resolved_line_number
      FROM order_items
    )
    UPDATE order_items oi
    SET line_number = ranked.resolved_line_number
    FROM ranked
    WHERE oi.id = ranked.id
      AND (oi.line_number IS NULL OR oi.line_number <= 0)
  `,
  `
    UPDATE order_items oi
    SET
      currency_code = COALESCE(oi.currency_code, o.currency_code),
      base_currency_code = COALESCE(oi.base_currency_code, o.base_currency_code),
      exchange_rate_to_base = COALESCE(oi.exchange_rate_to_base, o.exchange_rate_to_base, 1),
      base_original_unit_price = COALESCE(oi.base_original_unit_price, oi.original_unit_price),
      base_unit_price = COALESCE(oi.base_unit_price, oi.unit_price),
      base_discount_amount = COALESCE(oi.base_discount_amount, oi.discount_amount, 0),
      base_line_total = COALESCE(oi.base_line_total, oi.line_total)
    FROM orders o
    WHERE o.id = oi.order_id
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN original_unit_price SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN line_number SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN currency_code SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN base_currency_code SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN exchange_rate_to_base SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN base_original_unit_price SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN base_unit_price SET NOT NULL
  `,
  `
    ALTER TABLE order_items
    ALTER COLUMN base_line_total SET NOT NULL
  `,
  `
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1
        FROM pg_constraint
        WHERE conname = 'order_items_order_id_line_number_key'
      ) THEN
        ALTER TABLE order_items
        ADD CONSTRAINT order_items_order_id_line_number_key UNIQUE (order_id, line_number);
      END IF;
    END $$;
  `,
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS tracking_url TEXT",
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_known_location VARCHAR(120)",
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS last_event_at TIMESTAMPTZ",
  "ALTER TABLE shipments ADD COLUMN IF NOT EXISTS estimated_delivery_at TIMESTAMPTZ",
  "ALTER TABLE shipment_events ADD COLUMN IF NOT EXISTS event_code VARCHAR(40)",
  "ALTER TABLE shipment_events ALTER COLUMN event_code SET DEFAULT 'STATUS_UPDATE'",
  "UPDATE shipment_events SET event_code = 'STATUS_UPDATE' WHERE event_code IS NULL OR event_code = ''",
  'ALTER TABLE shipment_events ALTER COLUMN event_code SET NOT NULL',
  'ALTER TABLE shipment_events ADD COLUMN IF NOT EXISTS is_public BOOLEAN',
  'ALTER TABLE shipment_events ALTER COLUMN is_public SET DEFAULT TRUE',
  'UPDATE shipment_events SET is_public = TRUE WHERE is_public IS NULL',
  'ALTER TABLE shipment_events ALTER COLUMN is_public SET NOT NULL',
  "ALTER TABLE shipment_events ADD COLUMN IF NOT EXISTS metadata JSONB DEFAULT '{}'::jsonb",
  "UPDATE shipment_events SET metadata = '{}'::jsonb WHERE metadata IS NULL",
  "ALTER TABLE shipment_events ALTER COLUMN metadata SET DEFAULT '{}'::jsonb",
  'ALTER TABLE shipment_events ALTER COLUMN metadata SET NOT NULL',
  `
    UPDATE shipments
    SET tracking_url = CASE
      WHEN tracking_url IS NOT NULL OR tracking_number IS NULL THEN tracking_url
      WHEN LOWER(carrier) LIKE '%dhl%' THEN CONCAT('https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=', tracking_number)
      WHEN LOWER(carrier) LIKE '%fedex%' THEN CONCAT('https://www.fedex.com/fedextrack/?trknbr=', tracking_number)
      WHEN LOWER(carrier) LIKE '%ups%' THEN CONCAT('https://www.ups.com/track?tracknum=', tracking_number)
      WHEN LOWER(carrier) LIKE '%aramex%' THEN CONCAT('https://www.aramex.com/track/results?ShipmentNumber=', tracking_number)
      ELSE CONCAT('https://www.google.com/search?q=', REPLACE(COALESCE(carrier, 'shipment') || ' ' || tracking_number || ' tracking', ' ', '+'))
    END
  `,
  `
    UPDATE shipments s
    SET estimated_delivery_at = ((o.delivery_eta::text || ' 18:00:00+00')::timestamptz)
    FROM orders o
    WHERE s.order_id = o.id
      AND s.estimated_delivery_at IS NULL
      AND o.delivery_eta IS NOT NULL
  `,
  `
    WITH latest_events AS (
      SELECT DISTINCT ON (shipment_id)
        shipment_id,
        event_time,
        location
      FROM shipment_events
      ORDER BY shipment_id, event_time DESC, id DESC
    )
    UPDATE shipments s
    SET
      last_event_at = COALESCE(s.last_event_at, latest_events.event_time),
      last_known_location = COALESCE(s.last_known_location, latest_events.location)
    FROM latest_events
    WHERE s.id = latest_events.shipment_id
  `,
  `
    UPDATE shipments
    SET last_event_at = COALESCE(last_event_at, shipped_at, delivered_at)
    WHERE last_event_at IS NULL
  `,
  `
    INSERT INTO platform_settings (key, value_json, description)
    VALUES
      ('tax_rate', '0.07'::jsonb, 'Default marketplace tax rate used by the quote engine.'),
      ('free_shipping_threshold', '250'::jsonb, 'Order value at which standard shipping becomes free.'),
      ('support_email', '"support@realcommerce.com"'::jsonb, 'Primary support contact shown in admin workflows.'),
      ('default_return_window_days', '30'::jsonb, 'Default return window for storefront messaging.'),
      ('review_auto_publish', 'true'::jsonb, 'Whether verified reviews are published immediately.')
    ON CONFLICT (key) DO NOTHING
  `,
  `
    INSERT INTO price_history (product_id, previous_price, new_price, currency_code, change_source, note, changed_at)
    SELECT
      p.id,
      NULL,
      p.unit_price,
      p.currency_code,
      'UPGRADE_SNAPSHOT',
      'Price history seeded from the existing catalog during schema upgrade.',
      NOW()
    FROM products p
    WHERE NOT EXISTS (
      SELECT 1
      FROM price_history ph
      WHERE ph.product_id = p.id
    )
  `,
  `
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
    SELECT
      i.product_id,
      i.warehouse_id,
      GREATEST((i.reorder_point + i.safety_stock) - i.quantity_on_hand, 1),
      i.quantity_on_hand,
      i.reorder_point,
      'OPEN',
      'LOW_STOCK_TRIGGER',
      'Automatically generated during schema upgrade because inventory was already below the reorder point.'
    FROM inventory i
    WHERE i.quantity_on_hand <= i.reorder_point
      AND NOT EXISTS (
        SELECT 1
        FROM reorder_requests rr
        WHERE rr.product_id = i.product_id
          AND rr.warehouse_id = i.warehouse_id
          AND rr.status = 'OPEN'
      )
  `,
  `
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
    $$ LANGUAGE plpgsql
  `,
  `
    CREATE OR REPLACE FUNCTION sync_customer_metrics_from_orders()
    RETURNS TRIGGER AS $$
    BEGIN
      PERFORM refresh_customer_lifetime_and_tier(COALESCE(NEW.customer_id, OLD.customer_id));
      RETURN COALESCE(NEW, OLD);
    END;
    $$ LANGUAGE plpgsql
  `,
  `
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
    $$ LANGUAGE plpgsql
  `,
  `
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
    $$ LANGUAGE plpgsql
  `,
  'DROP TRIGGER IF EXISTS trg_orders_refresh_customer_metrics ON orders',
  `
    CREATE TRIGGER trg_orders_refresh_customer_metrics
    AFTER INSERT OR UPDATE OF customer_id, order_status, base_total_amount OR DELETE
    ON orders
    FOR EACH ROW
    EXECUTE FUNCTION sync_customer_metrics_from_orders()
  `,
  'DROP TRIGGER IF EXISTS trg_inventory_auto_reorder ON inventory',
  `
    CREATE TRIGGER trg_inventory_auto_reorder
    AFTER INSERT OR UPDATE OF quantity_on_hand, reorder_point, safety_stock
    ON inventory
    FOR EACH ROW
    EXECUTE FUNCTION create_reorder_request_if_needed()
  `,
  'DROP TRIGGER IF EXISTS trg_products_price_history ON products',
  `
    CREATE TRIGGER trg_products_price_history
    AFTER UPDATE OF unit_price, currency_code
    ON products
    FOR EACH ROW
    EXECUTE FUNCTION record_product_price_history()
  `,
  `
    CREATE OR REPLACE VIEW latest_exchange_rates AS
    SELECT DISTINCT ON (base_currency_code, target_currency_code)
      base_currency_code,
      target_currency_code,
      rate,
      effective_at
    FROM exchange_rates
    ORDER BY base_currency_code, target_currency_code, effective_at DESC, id DESC
  `,
  `
    CREATE OR REPLACE VIEW inventory_reorder_status AS
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
    ) open_requests ON TRUE
  `,
  `
    CREATE OR REPLACE VIEW product_sales_rankings AS
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
    GROUP BY c.id, c.name, p.id, p.name
  `,
  `
    CREATE OR REPLACE VIEW customer_value_insights AS
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
    JOIN customer_tiers ct ON ct.id = c.tier_id
  `,
  `
    CREATE OR REPLACE VIEW price_history_insights AS
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
    JOIN products p ON p.id = ph.product_id
  `,
  `
    CREATE OR REPLACE VIEW weekly_category_sales AS
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
    GROUP BY c.id, c.name, DATE_TRUNC('week', o.placed_at)
  `,
  'DROP MATERIALIZED VIEW IF EXISTS weekly_category_sales_snapshot CASCADE',
  `
    CREATE MATERIALIZED VIEW weekly_category_sales_snapshot AS
    SELECT *
    FROM weekly_category_sales
    WITH NO DATA
  `,
  `
    SELECT refresh_customer_lifetime_and_tier(id)
    FROM customers
  `,
  'REFRESH MATERIALIZED VIEW weekly_category_sales_snapshot',

  'CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id)',
  'CREATE INDEX IF NOT EXISTS idx_wishlists_customer ON wishlists(customer_id, added_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_orders_placed_at ON orders(placed_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_shipments_status_eta ON shipments(shipment_status, estimated_delivery_at, last_event_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_shipment_events_visibility ON shipment_events(shipment_id, is_public, event_time DESC)',
  'CREATE INDEX IF NOT EXISTS idx_price_history_product_changed_at ON price_history(product_id, changed_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_reorder_requests_product_status ON reorder_requests(product_id, warehouse_id, status, created_at DESC)',
  'CREATE INDEX IF NOT EXISTS idx_customers_lifetime_value ON customers(lifetime_value DESC)',
  'CREATE INDEX IF NOT EXISTS idx_orders_reporting_base_total ON orders(base_currency_code, placed_at DESC, base_total_amount DESC)',
  'CREATE INDEX IF NOT EXISTS idx_order_items_product_rankings ON order_items(product_id, base_line_total DESC, quantity DESC)',
  'CREATE UNIQUE INDEX IF NOT EXISTS idx_reorder_requests_open_unique ON reorder_requests(product_id, warehouse_id) WHERE status = \'OPEN\'',
  'CREATE INDEX IF NOT EXISTS idx_weekly_category_sales_snapshot_lookup ON weekly_category_sales_snapshot(week_start DESC, category_id)',
  'CREATE INDEX IF NOT EXISTS idx_external_service_syncs_lookup ON external_service_syncs(service_name, started_at DESC, id DESC)',
  'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_created_at ON admin_activity_logs(created_at DESC, id DESC)',
  'CREATE INDEX IF NOT EXISTS idx_admin_activity_logs_entity ON admin_activity_logs(entity_type, entity_id, created_at DESC)',
];

const applySchemaUpgrades = async () => {
  const client = await pool.connect();

  try {
    await client.query('SELECT pg_advisory_lock($1)', [SCHEMA_LOCK_ID]);

    await ensureDatabaseBootstrapped(client, { includeSeedData: true });

    await client.query('BEGIN');

    try {
      for (const statement of schemaUpgradeStatements) {
        await client.query(statement);
      }

      await client.query('COMMIT');
    } catch (error) {
      await client.query('ROLLBACK');
      throw error;
    }
  } catch (error) {
    throw error;
  } finally {
    try {
      await client.query('SELECT pg_advisory_unlock($1)', [SCHEMA_LOCK_ID]);
    } catch (_error) {
      // Ignore advisory unlock failures during shutdown/error unwinding.
    }
    client.release();
  }
};

module.exports = {
  applySchemaUpgrades,
  schemaUpgradeStatements,
};
