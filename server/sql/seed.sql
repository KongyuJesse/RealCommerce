INSERT INTO roles (name, description) VALUES
  ('admin', 'Full access to platform administration and configuration.'),
  ('operations_manager', 'Oversees fulfilment, shipments, and inventory health.'),
  ('merchandising_manager', 'Owns assortment, pricing, and category strategy.'),
  ('customer', 'Customer account for ordering, reviewing, and account management.');

INSERT INTO customer_tiers (name, discount_rate, min_lifetime_value, benefits) VALUES
  ('Starter', 0.00, 0.00, 'Access to base catalog and standard support.'),
  ('Growth', 5.00, 450.00, 'Priority replenishment notices and seasonal offers.'),
  ('Scale', 10.00, 1200.00, 'Lower negotiated rates with faster shipment handling.'),
  ('Enterprise', 15.00, 1700.00, 'Dedicated account support and volume pricing.');

INSERT INTO currencies (code, name, symbol, is_base) VALUES
  ('USD', 'United States Dollar', '$', TRUE),
  ('EUR', 'Euro', 'EUR', FALSE),
  ('GBP', 'British Pound Sterling', 'GBP', FALSE),
  ('NGN', 'Nigerian Naira', 'NGN', FALSE);

INSERT INTO payment_methods_catalog (id, label, provider, sort_order) VALUES
  ('card', 'Card', 'Stripe', 1),
  ('wallet', 'Wallet', 'Stripe', 2),
  ('bank_transfer', 'Bank transfer', 'Paystack', 3);

INSERT INTO shipping_methods_catalog (id, label, description, base_amount, eta_days, sort_order) VALUES
  ('standard', 'Standard delivery', 'Balanced shipping for regular parcels and replenishment orders.', 16.00, 6, 1),
  ('priority', 'Priority delivery', 'Faster handling for launches, replenishment spikes, and urgent replacements.', 32.00, 4, 2),
  ('freight', 'Freight coordination', 'For oversized items that need heavier fulfilment planning and carrier coordination.', 58.00, 8, 3);

INSERT INTO platform_settings (key, value_json, description) VALUES
  ('tax_rate', '0.07'::jsonb, 'Default marketplace tax rate used by the quote engine.'),
  ('free_shipping_threshold', '250'::jsonb, 'Order value at which standard shipping becomes free.'),
  ('support_email', '"support@realcommerce.com"'::jsonb, 'Primary support contact shown in admin workflows.'),
  ('default_return_window_days', '30'::jsonb, 'Default return window for storefront messaging.'),
  ('review_auto_publish', 'true'::jsonb, 'Whether verified reviews are published immediately.');

INSERT INTO content_blocks (block_type, slug, eyebrow, title, body, metadata, sort_order) VALUES
  ('hero_eyebrow', 'hero-operationally-ready', 'Homepage', 'Operationally ready', 'Use on the first hero slide for release-ready catalog stories.', '{"slot":"hero"}', 1),
  ('hero_eyebrow', 'hero-faster-fulfilment', 'Homepage', 'Faster fulfilment', 'Use on the second hero slide when highlighting delivery and stock readiness.', '{"slot":"hero"}', 2),
  ('hero_eyebrow', 'hero-designed-for-scale', 'Homepage', 'Designed for scale', 'Use on the third hero slide when the focus is resilience and growth.', '{"slot":"hero"}', 3),
  ('value_prop', 'value-prop-catalog', 'Storefront', 'Production-ready catalog', 'Structured inventory, pricing, imagery, and merchandising data stay connected to the same seeded system.', '{"slot":"value-props"}', 1),
  ('value_prop', 'value-prop-checkout', 'Storefront', 'Checkout to delivery', 'Cart, quote, order capture, shipment creation, and event tracking all run through the same backend flow.', '{"slot":"value-props"}', 2),
  ('value_prop', 'value-prop-operations', 'Storefront', 'Operational visibility', 'Admins and operators can work from low-stock alerts, recent orders, warehouse load, and shipment states.', '{"slot":"value-props"}', 3),
  ('access_note', 'demo-access-note', 'Access', 'Demo password hint', 'Use `RealCommerce!2026` for the seeded customer and staff accounts in development and showcase environments.', '{"slot":"access","passwordHint":"RealCommerce!2026"}', 1);

INSERT INTO exchange_rates (base_currency_code, target_currency_code, rate, effective_at) VALUES
  ('USD', 'EUR', 0.905000, '2026-02-01T07:30:00Z'),
  ('USD', 'EUR', 0.920000, '2026-03-08T07:30:00Z'),
  ('USD', 'GBP', 0.765000, '2026-02-01T07:30:00Z'),
  ('USD', 'GBP', 0.780000, '2026-03-08T07:30:00Z'),
  ('USD', 'NGN', 1518.000000, '2026-02-01T07:30:00Z'),
  ('USD', 'NGN', 1542.500000, '2026-03-08T07:30:00Z');

INSERT INTO users (role_id, full_name, email, password_hash, last_login_at) VALUES
  (1, 'Jesse Kongyu', 'jesse@realcommerce.com', 'scrypt$0db45cab019120cb60ed7361a35579d0$5d6f9a7bd606fc0fd1dd40f09ab5cc08a08025c78a9d3980ee24ca71f6cf26d128d2e657b1028f2de8d67caf9c4654831e2fde311509a0b4cd99fb0fb91844b9', '2026-03-08T08:10:00Z'),
  (2, 'Ada Osei', 'ada@realcommerce.com', 'scrypt$529121d4e7907f789f5cb8527bca1d97$1bc2dce0734358c227b77c760f82ef3d86783964e1b5dd52d713588b07c3ca8e65d4f754360082577aa8636e38e1fb843fc07f6efe240605100eb36fb4289deb', '2026-03-08T07:20:00Z'),
  (3, 'Maya Cole', 'maya@realcommerce.com', 'scrypt$78de9a165c32d53e5f9086c7436e371d$d9f3bef1e638e7efaae83d30e75b41ed38d7c99ec1ae95319c8c31462d49aa74e1294aa0720ddb7c8f84c00905404228225ab0606cfcf6a7ae487eecc2f193cf', '2026-03-07T18:30:00Z'),
  (4, 'Lionel Grant', 'lionel@bluehorizon.com', 'scrypt$4261dd7f1624b73d9301a7ee2185c0d7$602e1feca49e3063fc7a6908fb150be62a2455b7c6c1016470edfa50f5b83018fbddb834059674f96473bb63332435bee423e14bf732294c50220a04ba642a14', '2026-03-06T13:15:00Z'),
  (4, 'Sofia Nwosu', 'sofia@vitaretail.com', 'scrypt$79aaa411cf96520c3a63cb4de7add75c$8d6595b9273f7fa4ec4f1b057a1b19681d23ceebe155d15872fe77d24712fd630a95a3afaed0f9f31a29126c7dd4e88c013b09db5dd3b44a7414ca9297c794ff', '2026-03-07T11:00:00Z'),
  (3, 'Nadia Mensah', 'nadia@studioforge.shop', 'scrypt$0db45cab019120cb60ed7361a35579d0$5d6f9a7bd606fc0fd1dd40f09ab5cc08a08025c78a9d3980ee24ca71f6cf26d128d2e657b1028f2de8d67caf9c4654831e2fde311509a0b4cd99fb0fb91844b9', '2026-03-08T09:45:00Z'),
  (3, 'Kojo Asare', 'kojo@mobilityworks.shop', 'scrypt$529121d4e7907f789f5cb8527bca1d97$1bc2dce0734358c227b77c760f82ef3d86783964e1b5dd52d713588b07c3ca8e65d4f754360082577aa8636e38e1fb843fc07f6efe240605100eb36fb4289deb', '2026-03-08T09:10:00Z');

INSERT INTO categories (name, slug, description, hero_copy, is_featured) VALUES
  ('Workspace Systems', 'workspace-systems', 'Furniture and devices designed for high-output teams.', 'Flexible setups for founders, studios, and distributed operators.', TRUE),
  ('Connected Living', 'connected-living', 'Smart home hardware with calm, practical interfaces.', 'Ambient technology for homes that need less friction and more control.', TRUE),
  ('Wellness Technology', 'wellness-technology', 'Recovery and wellbeing products for modern work rhythms.', 'Products that make demanding work sustainable over long cycles.', TRUE),
  ('Urban Mobility', 'urban-mobility', 'Compact personal transport for fast city movement.', 'Durable transit products for dense, fast-moving neighborhoods.', FALSE),
  ('Creator Gear', 'creator-gear', 'Portable tools for production, streaming, and hybrid work.', 'Clean hardware choices for video, audio, and maker setups.', TRUE);

INSERT INTO seller_profiles (user_id, store_name, slug, description, support_email, phone, city, country, payout_currency_code, is_verified) VALUES
  (6, 'Studio Forge', 'studio-forge', 'Workspace and creator gear curated for premium hybrid teams.', 'support@studioforge.shop', '+233-30-555-2101', 'Accra', 'Ghana', 'USD', TRUE),
  (7, 'Mobility Works', 'mobility-works', 'Urban mobility hardware with a focus on durability and serviceability.', 'hello@mobilityworks.shop', '+234-1-555-2102', 'Lagos', 'Nigeria', 'USD', TRUE);

INSERT INTO products (
  seller_profile_id,
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
  (1, 1, 'RC-DSK-001', 'Atlas Standing Desk', 'atlas-standing-desk', 'Electric sit-stand desk with cable channel and memory presets.', 'Atlas pairs quiet dual motors with a hardened bamboo top so operators can shift from planning to fulfilment reviews without losing desk stability.', 899.00, 'USD', 'ACTIVE', TRUE, 'January 2026'),
  (1, 1, 'RC-CHR-002', 'Halo Task Chair', 'halo-task-chair', 'Breathable ergonomic chair tuned for long planning sessions.', 'Halo combines lumbar support, mesh cooling, and subtle posture guidance for teams running commerce operations all day.', 369.00, 'USD', 'ACTIVE', FALSE, 'February 2026'),
  (1, 2, 'RC-LMP-003', 'Pulse Smart Lamp', 'pulse-smart-lamp', 'Adaptive lighting with scene presets and occupancy awareness.', 'Pulse shifts brightness automatically through work, evening, and reading modes while syncing across connected spaces.', 129.00, 'USD', 'ACTIVE', TRUE, 'December 2025'),
  (1, 5, 'RC-AUD-004', 'Drift Noise-Canceling Buds', 'drift-noise-canceling-buds', 'Compact earbuds for creators and focused operators.', 'Drift delivers low-latency audio, clear microphones, and enough battery for full production days on the move.', 189.00, 'USD', 'ACTIVE', TRUE, 'January 2026'),
  (1, 3, 'RC-WEL-005', 'Tempo Recovery Massager', 'tempo-recovery-massager', 'Portable recovery tool with programmable pressure bands.', 'Tempo helps remote teams and creators reset between sessions with three calibrated intensity profiles and travel-friendly design.', 249.00, 'USD', 'ACTIVE', TRUE, 'November 2025'),
  (2, 4, 'RC-SCO-006', 'Rover Fold E-Scooter', 'rover-fold-e-scooter', 'Foldable commuter scooter built for short urban loops.', 'Rover packs a stable deck, regenerative braking, and durable range for repeat city routes between office, studio, and warehouse.', 1499.00, 'USD', 'ACTIVE', TRUE, 'March 2026');

INSERT INTO seller_discount_campaigns (
  seller_profile_id,
  name,
  code,
  description,
  discount_type,
  discount_value,
  applies_to,
  category_id,
  product_id,
  minimum_quantity,
  starts_at,
  ends_at,
  is_active
) VALUES
  (1, 'Workspace Refresh', 'REFRESH12', 'Store-wide savings for Studio Forge core listings.', 'PERCENT', 12.00, 'ALL_PRODUCTS', NULL, NULL, 1, '2026-03-01T00:00:00Z', '2026-12-31T23:59:59Z', TRUE),
  (1, 'Desk Launch Price', 'ATLAS150', 'Launch support on the Atlas desk line.', 'FIXED', 150.00, 'PRODUCT', NULL, 1, 1, '2026-03-01T00:00:00Z', '2026-09-30T23:59:59Z', TRUE),
  (2, 'Mobility Week', 'RIDE8', 'Seasonal city mobility promotion.', 'PERCENT', 8.00, 'CATEGORY', 4, NULL, 1, '2026-03-01T00:00:00Z', '2026-10-31T23:59:59Z', TRUE);

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

INSERT INTO price_history (product_id, previous_price, new_price, currency_code, change_source, note, changed_at) VALUES
  (1, NULL, 799.00, 'USD', 'SEED_HISTORY', 'Launch price for the Atlas desk.', '2026-01-05T09:00:00Z'),
  (1, 799.00, 849.00, 'USD', 'SEED_HISTORY', 'Spring demand adjustment.', '2026-02-10T09:00:00Z'),
  (1, 849.00, 899.00, 'USD', 'SEED_HISTORY', 'Current catalog price.', '2026-03-01T09:00:00Z'),
  (3, NULL, 119.00, 'USD', 'SEED_HISTORY', 'Initial smart lamp launch pricing.', '2025-12-15T09:00:00Z'),
  (3, 119.00, 125.00, 'USD', 'SEED_HISTORY', 'Connectivity bundle update.', '2026-01-20T09:00:00Z'),
  (3, 125.00, 129.00, 'USD', 'SEED_HISTORY', 'Current catalog price.', '2026-02-28T09:00:00Z'),
  (6, NULL, 1599.00, 'USD', 'SEED_HISTORY', 'Pre-launch list price.', '2026-02-14T09:00:00Z'),
  (6, 1599.00, 1499.00, 'USD', 'SEED_HISTORY', 'Launch promotion normalized into the base price.', '2026-03-03T09:00:00Z');

INSERT INTO warehouses (code, name, city, country, capacity_units) VALUES
  ('LAG-1', 'Lagos Core Fulfilment', 'Lagos', 'Nigeria', 2600),
  ('NBO-1', 'Nairobi East Hub', 'Nairobi', 'Kenya', 1800),
  ('RTM-1', 'Rotterdam Gateway', 'Rotterdam', 'Netherlands', 3400),
  ('ACC-1', 'Accra QuickShip', 'Accra', 'Ghana', 1200);

INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, reorder_point, safety_stock, updated_at) VALUES
  (1, 1, 32, 10, 6, '2026-03-08T07:45:00Z'),
  (1, 3, 7, 8, 4, '2026-03-08T07:45:00Z'),
  (2, 1, 44, 12, 8, '2026-03-08T07:45:00Z'),
  (2, 4, 20, 6, 4, '2026-03-08T07:45:00Z'),
  (3, 1, 90, 20, 12, '2026-03-08T07:45:00Z'),
  (3, 2, 74, 18, 10, '2026-03-08T07:45:00Z'),
  (4, 2, 58, 14, 8, '2026-03-08T07:45:00Z'),
  (4, 3, 41, 10, 6, '2026-03-08T07:45:00Z'),
  (5, 1, 26, 8, 4, '2026-03-08T07:45:00Z'),
  (5, 4, 22, 8, 4, '2026-03-08T07:45:00Z'),
  (6, 2, 3, 4, 2, '2026-03-08T07:45:00Z'),
  (6, 3, 16, 4, 2, '2026-03-08T07:45:00Z');

INSERT INTO customers (user_id, tier_id, company_name, first_name, last_name, email, phone, city, country) VALUES
  (4, 2, 'Blue Horizon Studio', 'Lionel', 'Grant', 'lionel@bluehorizon.com', '+234-800-555-0101', 'Lagos', 'Nigeria'),
  (5, 3, 'VitaRetail Labs', 'Sofia', 'Nwosu', 'sofia@vitaretail.com', '+234-800-555-0102', 'Abuja', 'Nigeria'),
  (NULL, 4, 'Northlight Offices', 'Clara', 'Bennett', 'clara@northlightoffices.com', '+44-20-5555-0110', 'London', 'United Kingdom'),
  (NULL, 2, 'Urban Cart Market', 'Samuel', 'Okeke', 'samuel@urbancart.market', '+254-700-555-0111', 'Nairobi', 'Kenya');

INSERT INTO customer_addresses (
  customer_id,
  label,
  recipient_name,
  line1,
  line2,
  city,
  state_region,
  postal_code,
  country,
  phone,
  is_default_shipping,
  is_default_billing
) VALUES
  (1, 'HQ delivery', 'Lionel Grant', '17 Admiralty Way', 'Suite 3A', 'Lagos', 'Lagos', '101241', 'Nigeria', '+234-800-555-0101', TRUE, TRUE),
  (2, 'Operations office', 'Sofia Nwosu', '4 Independence Avenue', NULL, 'Abuja', 'FCT', '900211', 'Nigeria', '+234-800-555-0102', TRUE, TRUE),
  (3, 'Studio floor', 'Clara Bennett', '22 Southbank Lane', NULL, 'London', 'Greater London', 'SE1 7PB', 'United Kingdom', '+44-20-5555-0110', TRUE, TRUE),
  (4, 'Main market branch', 'Samuel Okeke', '9 Parklands Road', NULL, 'Nairobi', 'Nairobi County', '00100', 'Kenya', '+254-700-555-0111', TRUE, TRUE);

INSERT INTO promotions (code, title, description, discount_type, discount_value, minimum_order_amount, starts_at, ends_at) VALUES
  ('WELCOME10', 'Welcome savings', 'Ten percent off the first operationally-ready basket.', 'PERCENT', 10.00, 150.00, '2026-03-01T00:00:00Z', '2026-12-31T23:59:59Z'),
  ('SHIPSMART', 'Priority shipping assist', 'Reduce shipping cost on higher-value orders.', 'SHIPPING', 20.00, 500.00, '2026-03-01T00:00:00Z', '2026-12-31T23:59:59Z'),
  ('BULK150', 'Team rollout credit', 'Flat credit for larger procurement runs.', 'FIXED', 150.00, 1800.00, '2026-03-01T00:00:00Z', '2026-12-31T23:59:59Z');

INSERT INTO carts (customer_id, currency_code, status, created_at, updated_at) VALUES
  (1, 'USD', 'ACTIVE', '2026-03-08T07:55:00Z', '2026-03-08T07:58:00Z'),
  (2, 'USD', 'ACTIVE', '2026-03-08T08:05:00Z', '2026-03-08T08:06:00Z');

INSERT INTO cart_items (cart_id, product_id, quantity, currency_code, original_unit_price, unit_price, discount_amount, discount_label, created_at) VALUES
  (1, 3, 2, 'USD', 129.00, 113.52, 15.48, 'Workspace Refresh', '2026-03-08T07:56:00Z'),
  (1, 4, 1, 'USD', 189.00, 166.32, 22.68, 'Workspace Refresh', '2026-03-08T07:57:00Z'),
  (2, 1, 1, 'USD', 899.00, 749.00, 150.00, 'Desk Launch Price', '2026-03-08T08:06:00Z');

INSERT INTO product_reviews (product_id, customer_id, rating, title, body, is_verified_purchase, created_at) VALUES
  (1, 1, 5, 'Desk feels premium in daily use', 'Stable through long planning days and easy to keep cable management clean.', TRUE, '2026-03-07T10:20:00Z'),
  (3, 1, 4, 'Lamp scenes are surprisingly useful', 'The occupancy presets make the studio feel calmer without constant manual tweaks.', TRUE, '2026-03-06T14:10:00Z'),
  (4, 2, 5, 'Great for creator workflows', 'Battery life and microphone clarity have been excellent across editing sessions.', TRUE, '2026-03-05T09:40:00Z'),
  (6, 4, 4, 'Reliable city range', 'The foldable frame is practical and the braking feels confidence-inspiring.', TRUE, '2026-03-04T16:25:00Z');

INSERT INTO orders (
  customer_id,
  order_number,
  currency_code,
  base_currency_code,
  exchange_rate_to_base,
  order_status,
  payment_method,
  shipping_method,
  subtotal_amount,
  seller_discount_amount,
  tier_discount_amount,
  promo_discount_amount,
  discount_amount,
  shipping_amount,
  tax_amount,
  total_amount,
  base_subtotal_amount,
  base_seller_discount_amount,
  base_tier_discount_amount,
  base_promo_discount_amount,
  base_discount_amount,
  base_shipping_amount,
  base_tax_amount,
  base_total_amount,
  promo_code,
  shipping_address,
  billing_address,
  notes,
  placed_at,
  delivery_eta
) VALUES
  (2, 'RC-1001', 'USD', 'USD', 1.000000, 'PROCESSING', 'card', 'priority', 1466.00, 218.04, 0.00, 0.00, 218.04, 35.00, 87.36, 1370.32, 1466.00, 218.04, 0.00, 0.00, 218.04, 35.00, 87.36, 1370.32, NULL, '{"recipientName":"Sofia Nwosu","line1":"4 Independence Avenue","city":"Abuja","country":"Nigeria"}', '{"recipientName":"Sofia Nwosu","line1":"4 Independence Avenue","city":"Abuja","country":"Nigeria"}', 'Priority delivery for office rollout.', '2026-03-08T08:00:00Z', '2026-03-12'),
  (1, 'RC-1002', 'USD', 'USD', 1.000000, 'SHIPPED', 'bank_transfer', 'freight', 1499.00, 120.00, 0.00, 0.00, 120.00, 55.00, 96.53, 1530.53, 1499.00, 120.00, 0.00, 0.00, 120.00, 55.00, 96.53, 1530.53, NULL, '{"recipientName":"Lionel Grant","line1":"17 Admiralty Way","city":"Lagos","country":"Nigeria"}', '{"recipientName":"Lionel Grant","line1":"17 Admiralty Way","city":"Lagos","country":"Nigeria"}', 'Freight coordination required on arrival.', '2026-03-07T14:20:00Z', '2026-03-11'),
  (3, 'RC-1003', 'USD', 'USD', 1.000000, 'DELIVERED', 'card', 'standard', 498.00, 60.00, 0.00, 0.00, 60.00, 18.00, 30.66, 486.66, 498.00, 60.00, 0.00, 0.00, 60.00, 18.00, 30.66, 486.66, NULL, '{"recipientName":"Clara Bennett","line1":"22 Southbank Lane","city":"London","country":"United Kingdom"}', '{"recipientName":"Clara Bennett","line1":"22 Southbank Lane","city":"London","country":"United Kingdom"}', 'Delivery completed to studio floor.', '2026-03-06T09:10:00Z', '2026-03-09'),
  (4, 'RC-1004', 'USD', 'USD', 1.000000, 'PENDING', 'card', 'priority', 1595.00, 233.52, 0.00, 0.00, 233.52, 40.00, 95.30, 1496.78, 1595.00, 233.52, 0.00, 0.00, 233.52, 40.00, 95.30, 1496.78, NULL, '{"recipientName":"Samuel Okeke","line1":"9 Parklands Road","city":"Nairobi","country":"Kenya"}', '{"recipientName":"Samuel Okeke","line1":"9 Parklands Road","city":"Nairobi","country":"Kenya"}', 'Awaiting payment confirmation.', '2026-03-05T16:45:00Z', '2026-03-13'),
  (2, 'RC-1005', 'USD', 'USD', 1.000000, 'PROCESSING', 'card', 'standard', 249.00, 0.00, 0.00, 0.00, 0.00, 12.00, 17.43, 278.43, 249.00, 0.00, 0.00, 0.00, 0.00, 12.00, 17.43, 278.43, NULL, '{"recipientName":"Sofia Nwosu","line1":"4 Independence Avenue","city":"Abuja","country":"Nigeria"}', '{"recipientName":"Sofia Nwosu","line1":"4 Independence Avenue","city":"Abuja","country":"Nigeria"}', 'Route through standard parcel line.', '2026-03-04T11:35:00Z', '2026-03-08'),
  (1, 'RC-1006', 'USD', 'USD', 1.000000, 'PAID', 'wallet', 'standard', 258.00, 30.96, 0.00, 22.70, 53.66, 15.00, 14.30, 233.64, 258.00, 30.96, 0.00, 22.70, 53.66, 15.00, 14.30, 233.64, 'WELCOME10', '{"recipientName":"Lionel Grant","line1":"17 Admiralty Way","city":"Lagos","country":"Nigeria"}', '{"recipientName":"Lionel Grant","line1":"17 Admiralty Way","city":"Lagos","country":"Nigeria"}', 'Marketing test order with promo code applied.', '2026-03-03T13:05:00Z', '2026-03-07');

INSERT INTO order_items (
  order_id,
  line_number,
  product_id,
  quantity,
  currency_code,
  base_currency_code,
  exchange_rate_to_base,
  original_unit_price,
  unit_price,
  discount_amount,
  base_original_unit_price,
  base_unit_price,
  base_discount_amount,
  discount_label,
  line_total,
  base_line_total
) VALUES
  (1, 1, 1, 1, 'USD', 'USD', 1.000000, 899.00, 749.00, 150.00, 899.00, 749.00, 150.00, 'Desk Launch Price', 749.00, 749.00),
  (1, 2, 3, 1, 'USD', 'USD', 1.000000, 129.00, 113.52, 15.48, 129.00, 113.52, 15.48, 'Workspace Refresh', 113.52, 113.52),
  (1, 3, 4, 1, 'USD', 'USD', 1.000000, 189.00, 166.32, 22.68, 189.00, 166.32, 22.68, 'Workspace Refresh', 166.32, 166.32),
  (1, 4, 5, 1, 'USD', 'USD', 1.000000, 249.00, 219.12, 29.88, 249.00, 219.12, 29.88, 'Workspace Refresh', 219.12, 219.12),
  (2, 1, 6, 1, 'USD', 'USD', 1.000000, 1499.00, 1379.00, 120.00, 1499.00, 1379.00, 120.00, 'Mobility Week', 1379.00, 1379.00),
  (3, 1, 2, 1, 'USD', 'USD', 1.000000, 369.00, 324.72, 44.28, 369.00, 324.72, 44.28, 'Workspace Refresh', 324.72, 324.72),
  (3, 2, 3, 1, 'USD', 'USD', 1.000000, 129.00, 113.28, 15.72, 129.00, 113.28, 15.72, 'Workspace Refresh', 113.28, 113.28),
  (4, 1, 1, 1, 'USD', 'USD', 1.000000, 899.00, 749.00, 150.00, 899.00, 749.00, 150.00, 'Desk Launch Price', 749.00, 749.00),
  (4, 2, 5, 1, 'USD', 'USD', 1.000000, 249.00, 219.12, 29.88, 249.00, 219.12, 29.88, 'Workspace Refresh', 219.12, 219.12),
  (4, 3, 4, 1, 'USD', 'USD', 1.000000, 189.00, 166.32, 22.68, 189.00, 166.32, 22.68, 'Workspace Refresh', 166.32, 166.32),
  (4, 4, 3, 2, 'USD', 'USD', 1.000000, 129.00, 113.52, 15.48, 129.00, 113.52, 15.48, 'Workspace Refresh', 227.04, 227.04),
  (5, 1, 5, 1, 'USD', 'USD', 1.000000, 249.00, 249.00, 0.00, 249.00, 249.00, 0.00, NULL, 249.00, 249.00),
  (6, 1, 3, 2, 'USD', 'USD', 1.000000, 129.00, 113.52, 15.48, 129.00, 113.52, 15.48, 'Workspace Refresh', 227.04, 227.04);

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
  tracking_url,
  last_known_location,
  last_event_at,
  estimated_delivery_at,
  shipped_at,
  delivered_at
) VALUES
  (1, 1, 'DHL', 'Priority', 'PACKED', 'trk_rc_1001', 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=trk_rc_1001', 'Lagos Core Fulfilment', '2026-03-08T10:10:00Z', '2026-03-12T18:00:00Z', '2026-03-08T10:10:00Z', NULL),
  (2, 3, 'FedEx', 'Express', 'IN_TRANSIT', 'trk_rc_1002', 'https://www.fedex.com/fedextrack/?trknbr=trk_rc_1002', 'Rotterdam Gateway', '2026-03-07T18:00:00Z', '2026-03-11T18:00:00Z', '2026-03-07T18:00:00Z', NULL),
  (3, 4, 'UPS', 'Standard', 'DELIVERED', 'trk_rc_1003', 'https://www.ups.com/track?tracknum=trk_rc_1003', 'Accra QuickShip', '2026-03-08T13:15:00Z', '2026-03-08T18:00:00Z', '2026-03-06T15:30:00Z', '2026-03-08T13:15:00Z'),
  (4, 2, 'DHL', 'Priority', 'PENDING', 'trk_rc_1004', 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=trk_rc_1004', 'Nairobi East Hub', '2026-03-05T17:00:00Z', '2026-03-09T18:00:00Z', NULL, NULL),
  (5, 1, 'Aramex', 'Standard', 'PICKING', 'trk_rc_1005', 'https://www.aramex.com/track/results?ShipmentNumber=trk_rc_1005', 'Lagos Core Fulfilment', '2026-03-04T12:05:00Z', '2026-03-08T18:00:00Z', NULL, NULL),
  (6, 1, 'DHL', 'Express', 'PENDING', 'trk_rc_1006', 'https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=trk_rc_1006', 'Lagos Core Fulfilment', '2026-03-03T13:12:00Z', '2026-03-07T18:00:00Z', NULL, NULL);

INSERT INTO order_status_events (order_id, status, note, actor_role, created_at) VALUES
  (1, 'PENDING', 'Checkout completed and payment captured.', 'customer', '2026-03-08T08:03:00Z'),
  (1, 'PROCESSING', 'Warehouse team accepted fulfilment work.', 'operations_manager', '2026-03-08T09:12:00Z'),
  (2, 'PAID', 'Funds cleared via bank transfer.', 'customer', '2026-03-07T14:26:00Z'),
  (2, 'SHIPPED', 'Freight handoff completed.', 'operations_manager', '2026-03-07T18:05:00Z'),
  (3, 'DELIVERED', 'Customer confirmed receipt.', 'operations_manager', '2026-03-08T13:20:00Z'),
  (4, 'PENDING', 'Payment still awaiting authorization.', 'customer', '2026-03-05T16:50:00Z'),
  (5, 'PROCESSING', 'Picked for standard parcel dispatch.', 'operations_manager', '2026-03-04T14:10:00Z'),
  (6, 'PAID', 'Wallet capture completed successfully.', 'customer', '2026-03-03T13:09:00Z');

INSERT INTO shipment_events (shipment_id, status, event_code, location, note, is_public, metadata, event_time) VALUES
  (1, 'PACKED', 'PACKED_SCAN', 'Lagos Core Fulfilment', 'Order packed and ready for carrier pickup.', TRUE, '{"channel":"warehouse"}', '2026-03-08T10:10:00Z'),
  (2, 'IN_TRANSIT', 'DEPARTED_GATEWAY', 'Rotterdam Gateway', 'Freight shipment departed gateway.', TRUE, '{"channel":"carrier"}', '2026-03-07T18:00:00Z'),
  (3, 'DELIVERED', 'DELIVERY_CONFIRMED', 'Accra QuickShip', 'Signed for by receiving desk.', TRUE, '{"proofOfDelivery":"receiving-desk"}', '2026-03-08T13:15:00Z'),
  (4, 'PENDING', 'PAYMENT_HOLD', 'Nairobi East Hub', 'Waiting for payment release before dispatch.', FALSE, '{"reason":"awaiting-payment"}', '2026-03-05T17:00:00Z'),
  (5, 'PICKING', 'PICK_STARTED', 'Lagos Core Fulfilment', 'Items are being picked from stock.', TRUE, '{"channel":"warehouse"}', '2026-03-04T12:05:00Z'),
  (6, 'PENDING', 'SHIPMENT_CREATED', 'Lagos Core Fulfilment', 'Shipment created and queued.', TRUE, '{"channel":"checkout"}', '2026-03-03T13:12:00Z');

SELECT refresh_customer_lifetime_and_tier(id)
FROM customers;

REFRESH MATERIALIZED VIEW weekly_category_sales_snapshot;
