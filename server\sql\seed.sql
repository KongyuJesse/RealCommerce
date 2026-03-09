INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to platform administration and configuration.'),
  ('operations_manager', 'Oversees fulfilment, shipments, and inventory health.'),
  ('merchandising_manager', 'Owns assortment, pricing, and category strategy.'),
  ('customer', 'End-customer account for ordering and account management.');

INSERT INTO customer_tiers (name, discount_rate, benefits) VALUES
  ('Starter', 0.00, 'Access to base catalog and standard support.'),
  ('Growth', 5.00, 'Priority replenishment notices and seasonal offers.'),
  ('Scale', 10.00, 'Lower negotiated rates with faster shipment handling.'),
  ('Enterprise', 15.00, 'Dedicated account support and volume pricing.');

INSERT INTO currencies (code, name, symbol, is_base) VALUES
  ('USD', 'United States Dollar', '$', TRUE),
  ('EUR', 'Euro', 'EUR', FALSE),
  ('GBP', 'British Pound Sterling', 'GBP', FALSE),
  ('NGN', 'Nigerian Naira', 'NGN', FALSE);

INSERT INTO exchange_rates (base_currency_code, target_currency_code, rate, effective_at) VALUES
  ('USD', 'EUR', 0.920000, '2026-03-08T07:30:00Z'),
  ('USD', 'GBP', 0.780000, '2026-03-08T07:30:00Z'),
  ('USD', 'NGN', 1542.500000, '2026-03-08T07:30:00Z');

INSERT INTO users (role_id, full_name, email, password_hash, last_login_at) VALUES
  (1, 'Jesse Kongyu', 'jesse@realcommerce.com', '$2b$10$demo-admin-hash', '2026-03-08T08:10:00Z'),
  (2, 'Ada Osei', 'ada@realcommerce.com', '$2b$10$demo-ops-hash', '2026-03-08T07:20:00Z'),
  (3, 'Maya Cole', 'maya@realcommerce.com', '$2b$10$demo-merchant-hash', '2026-03-07T18:30:00Z'),
  (4, 'Lionel Grant', 'lionel@bluehorizon.com', '$2b$10$demo-customer-hash', '2026-03-06T13:15:00Z'),
  (4, 'Sofia Nwosu', 'sofia@vitaretail.com', '$2b$10$demo-customer-hash', '2026-03-07T11:00:00Z');

INSERT INTO categories (name, slug, description, hero_copy, is_featured) VALUES
  ('Workspace Systems', 'workspace-systems', 'Furniture and devices designed for high-output teams.', 'Flexible setups for founders, studios, and distributed operators.', TRUE),
  ('Connected Living', 'connected-living', 'Smart home hardware with calm, practical interfaces.', 'Ambient technology for homes that need less friction and more control.', TRUE),
  ('Wellness Technology', 'wellness-technology', 'Recovery and wellbeing products for modern work rhythms.', 'Products that make demanding work sustainable over long cycles.', TRUE),
  ('Urban Mobility', 'urban-mobility', 'Compact personal transport for fast city movement.', 'Durable transit products for dense, fast-moving neighborhoods.', FALSE),
  ('Creator Gear', 'creator-gear', 'Portable tools for production, streaming, and hybrid work.', 'Clean hardware choices for video, audio, and maker setups.', TRUE);

INSERT INTO products (
  category_id,
  sku,
  name,
  slug,
  short_description,
  long_description,
  unit_price,
  currency_code,
  status,
  is_featured,
  launch_month
) VALUES
  (1, 'RC-DSK-001', 'Atlas Standing Desk', 'atlas-standing-desk', 'Electric sit-stand desk with cable channel and memory presets.', 'Atlas pairs quiet dual motors with a hardened bamboo top so operators can shift from planning to fulfilment reviews without losing desk stability.', 899.00, 'USD', 'ACTIVE', TRUE, 'January 2026'),
  (1, 'RC-CHR-002', 'Halo Task Chair', 'halo-task-chair', 'Breathable ergonomic chair tuned for long planning sessions.', 'Halo combines lumbar support, mesh cooling, and subtle posture guidance for teams running commerce operations all day.', 369.00, 'USD', 'ACTIVE', FALSE, 'February 2026'),
  (2, 'RC-LMP-003', 'Pulse Smart Lamp', 'pulse-smart-lamp', 'Adaptive lighting with scene presets and occupancy awareness.', 'Pulse shifts brightness automatically through work, evening, and reading modes while syncing across connected spaces.', 129.00, 'USD', 'ACTIVE', TRUE, 'December 2025'),
  (5, 'RC-AUD-004', 'Drift Noise-Canceling Buds', 'drift-noise-canceling-buds', 'Compact earbuds for creators and focused operators.', 'Drift delivers low-latency audio, clear microphones, and enough battery for full production days on the move.', 189.00, 'USD', 'ACTIVE', TRUE, 'January 2026'),
  (3, 'RC-WEL-005', 'Tempo Recovery Massager', 'tempo-recovery-massager', 'Portable recovery tool with programmable pressure bands.', 'Tempo helps remote teams and creators reset between sessions with three calibrated intensity profiles and travel-friendly design.', 249.00, 'USD', 'ACTIVE', TRUE, 'November 2025'),
  (4, 'RC-SCO-006', 'Rover Fold E-Scooter', 'rover-fold-e-scooter', 'Foldable commuter scooter built for short urban loops.', 'Rover packs a stable deck, regenerative braking, and durable range for repeat city routes between office, studio, and warehouse.', 1499.00, 'USD', 'ACTIVE', TRUE, 'March 2026');

INSERT INTO product_images (
  product_id,
  storage_provider,
  source_url,
  mime_type,
  alt_text,
  display_order,
  is_primary,
  asset_status
) VALUES
  (1, 'external', 'https://images.pexels.com/photos/31726561/pexels-photo-31726561.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Atlas Standing Desk in a clean premium workspace.', 0, TRUE, 'READY'),
  (2, 'external', 'https://images.pexels.com/photos/31726674/pexels-photo-31726674.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Halo Task Chair next to a modern office desk.', 0, TRUE, 'READY'),
  (3, 'external', 'https://images.pexels.com/photos/19844043/pexels-photo-19844043.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Pulse Smart Lamp styled on a warm-toned side table.', 0, TRUE, 'READY'),
  (4, 'external', 'https://images.pexels.com/photos/3394666/pexels-photo-3394666.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Drift Noise-Canceling Buds in a premium product composition.', 0, TRUE, 'READY'),
  (5, 'external', 'https://images.pexels.com/photos/5327474/pexels-photo-5327474.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Tempo Recovery Massager used during a fitness recovery session.', 0, TRUE, 'READY'),
  (6, 'external', 'https://images.pexels.com/photos/15818617/pexels-photo-15818617.jpeg?auto=compress&cs=tinysrgb&w=1200&h=1200&dpr=1', 'image/jpeg', 'Rover Fold E-Scooter in a city mobility environment.', 0, TRUE, 'READY');

INSERT INTO product_attributes (name, display_name, value_type) VALUES
  ('finish', 'Finish', 'TEXT'),
  ('connectivity', 'Connectivity', 'TEXT'),
  ('battery_life', 'Battery Life', 'TEXT'),
  ('material', 'Material', 'TEXT'),
  ('shipping_class', 'Shipping Class', 'TEXT');

INSERT INTO product_attribute_values (product_id, attribute_id, value_text) VALUES
  (1, 1, 'Natural bamboo / graphite frame'),
  (1, 4, 'Steel and bamboo'),
  (1, 5, 'Freight'),
  (2, 1, 'Carbon mesh / matte black'),
  (2, 4, 'Aluminum and mesh'),
  (2, 5, 'Standard parcel'),
  (3, 1, 'Sandstone'),
  (3, 2, 'Wi-Fi + Bluetooth'),
  (3, 5, 'Standard parcel'),
  (4, 2, 'Bluetooth 5.4'),
  (4, 3, '36 hours'),
  (4, 5, 'Express parcel'),
  (5, 3, '4 hours'),
  (5, 4, 'Aluminum shell'),
  (5, 5, 'Standard parcel'),
  (6, 3, '48 km range'),
  (6, 4, 'Aluminum frame'),
  (6, 5, 'Freight');

INSERT INTO warehouses (code, name, city, country, capacity_units) VALUES
  ('LAG-1', 'Lagos Core Fulfilment', 'Lagos', 'Nigeria', 2600),
  ('NBO-1', 'Nairobi East Hub', 'Nairobi', 'Kenya', 1800),
  ('RTM-1', 'Rotterdam Gateway', 'Rotterdam', 'Netherlands', 3400),
  ('ACC-1', 'Accra QuickShip', 'Accra', 'Ghana', 1200);

INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, reorder_point, safety_stock, updated_at) VALUES
  (1, 1, 32, 10, 6, '2026-03-08T07:45:00Z'),
  (1, 3, 18, 8, 4, '2026-03-08T07:45:00Z'),
  (2, 1, 44, 12, 8, '2026-03-08T07:45:00Z'),
  (2, 4, 20, 6, 4, '2026-03-08T07:45:00Z'),
  (3, 1, 90, 20, 12, '2026-03-08T07:45:00Z'),
  (3, 2, 74, 18, 10, '2026-03-08T07:45:00Z'),
  (4, 2, 58, 14, 8, '2026-03-08T07:45:00Z'),
  (4, 3, 41, 10, 6, '2026-03-08T07:45:00Z'),
  (5, 1, 26, 8, 4, '2026-03-08T07:45:00Z'),
  (5, 4, 22, 8, 4, '2026-03-08T07:45:00Z'),
  (6, 2, 12, 4, 2, '2026-03-08T07:45:00Z'),
  (6, 3, 16, 4, 2, '2026-03-08T07:45:00Z');

INSERT INTO customers (user_id, tier_id, company_name, first_name, last_name, email, phone, city, country) VALUES
  (4, 2, 'Blue Horizon Studio', 'Lionel', 'Grant', 'lionel@bluehorizon.com', '+234-800-555-0101', 'Lagos', 'Nigeria'),
  (5, 3, 'VitaRetail Labs', 'Sofia', 'Nwosu', 'sofia@vitaretail.com', '+234-800-555-0102', 'Abuja', 'Nigeria'),
  (NULL, 4, 'Northlight Offices', 'Clara', 'Bennett', 'clara@northlightoffices.com', '+44-20-5555-0110', 'London', 'United Kingdom'),
  (NULL, 2, 'Urban Cart Market', 'Samuel', 'Okeke', 'samuel@urbancart.market', '+254-700-555-0111', 'Nairobi', 'Kenya');

INSERT INTO orders (
  customer_id,
  order_number,
  currency_code,
  order_status,
  subtotal_amount,
  shipping_amount,
  tax_amount,
  total_amount,
  placed_at,
  delivery_eta
) VALUES
  (2, 'RC-1001', 'USD', 'PROCESSING', 1277.00, 35.00, 89.39, 1401.39, '2026-03-08T08:00:00Z', '2026-03-12'),
  (1, 'RC-1002', 'USD', 'SHIPPED', 1499.00, 55.00, 104.78, 1658.78, '2026-03-07T14:20:00Z', '2026-03-11'),
  (3, 'RC-1003', 'USD', 'DELIVERED', 378.00, 18.00, 26.46, 422.46, '2026-03-06T09:10:00Z', '2026-03-09'),
  (4, 'RC-1004', 'USD', 'PENDING', 1628.00, 40.00, 113.96, 1781.96, '2026-03-05T16:45:00Z', '2026-03-13'),
  (2, 'RC-1005', 'USD', 'PROCESSING', 249.00, 12.00, 18.27, 279.27, '2026-03-04T11:35:00Z', '2026-03-08'),
  (1, 'RC-1006', 'USD', 'PAID', 258.00, 15.00, 19.11, 292.11, '2026-03-03T13:05:00Z', '2026-03-07');

INSERT INTO order_items (order_id, product_id, quantity, unit_price, line_total) VALUES
  (1, 1, 1, 899.00, 899.00),
  (1, 3, 1, 129.00, 129.00),
  (1, 4, 1, 189.00, 189.00),
  (1, 5, 1, 60.00, 60.00),
  (2, 6, 1, 1499.00, 1499.00),
  (3, 2, 1, 369.00, 369.00),
  (3, 3, 1, 9.00, 9.00),
  (4, 1, 1, 899.00, 899.00),
  (4, 5, 1, 249.00, 249.00),
  (4, 4, 1, 189.00, 189.00),
  (4, 3, 2, 145.50, 291.00),
  (5, 5, 1, 249.00, 249.00),
  (6, 3, 2, 129.00, 258.00);

INSERT INTO payments (order_id, provider, payment_method, amount, payment_status, paid_at, transaction_reference) VALUES
  (1, 'Stripe', 'card', 1401.39, 'CAPTURED', '2026-03-08T08:03:00Z', 'txn_rc_1001'),
  (2, 'Paystack', 'bank_transfer', 1658.78, 'CAPTURED', '2026-03-07T14:26:00Z', 'txn_rc_1002'),
  (3, 'Stripe', 'card', 422.46, 'CAPTURED', '2026-03-06T09:14:00Z', 'txn_rc_1003'),
  (4, 'Flutterwave', 'card', 1781.96, 'PENDING', NULL, 'txn_rc_1004'),
  (5, 'Paystack', 'card', 279.27, 'AUTHORIZED', '2026-03-04T11:39:00Z', 'txn_rc_1005'),
  (6, 'Stripe', 'wallet', 292.11, 'CAPTURED', '2026-03-03T13:09:00Z', 'txn_rc_1006');

INSERT INTO shipments (
  order_id,
  warehouse_id,
  carrier,
  service_level,
  shipment_status,
  tracking_number,
  shipped_at,
  delivered_at
) VALUES
  (1, 1, 'DHL', 'Priority', 'PACKED', 'trk_rc_1001', '2026-03-08T10:10:00Z', NULL),
  (2, 3, 'FedEx', 'Express', 'IN_TRANSIT', 'trk_rc_1002', '2026-03-07T18:00:00Z', NULL),
  (3, 4, 'UPS', 'Standard', 'DELIVERED', 'trk_rc_1003', '2026-03-06T15:30:00Z', '2026-03-08T13:15:00Z'),
  (4, 2, 'DHL', 'Priority', 'PENDING', 'trk_rc_1004', NULL, NULL),
  (5, 1, 'Aramex', 'Standard', 'PICKING', 'trk_rc_1005', NULL, NULL),
  (6, 1, 'DHL', 'Express', 'PENDING', 'trk_rc_1006', NULL, NULL);
