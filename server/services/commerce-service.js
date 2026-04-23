const crypto = require('crypto');
const config = require('../config');
const { query, withTransaction } = require('../db');
const { buildPublicUrl, createSignedUpload, getStorageStatus } = require('./storage-service');
const {
  getContentBlocks,
  getDemoUsers,
  getExchangeRates,
  getLookups,
  getPaymentMethods,
  getShippingMethods,
} = require('./content-service');
const { listAdminActivity, recordAdminActivity } = require('./activity-log-service');
const { listManagedUsers, listWarehouses } = require('./admin-service');
const { getExchangeRateSyncStatus } = require('./exchange-rate-sync-service');
const { assert, asNumber, isNonEmptyString, normalizeEmail, isEmail } = require('../utils/validation');
const {
  normalizeText,
  normalizeNullableText,
  normalizeBoolean,
  roundMoney,
  mapMoneyRow,
  mapNullableMoneyRow,
} = require('../utils/format');
const {
  sendOrderConfirmationEmail,
  sendShipmentDispatchedEmail,
  sendDeliveryConfirmationEmail,
} = require('./email-service');

const roundRate = (value) => Number(Number(value || 0).toFixed(6));
const addDays = (date, days) => new Date(date.getTime() + days * 24 * 60 * 60 * 1000);
const createOrderNumber = () => `RC-${Date.now().toString().slice(-8)}${crypto.randomInt(10, 100)}`;
const buildImageUrl = (image) => image.public_url || image.source_url || buildPublicUrl(image.object_path);
const MAX_PRODUCT_LIMIT = 60;
const ALLOWED_IMAGE_MIME_TYPES = new Set([
  'image/avif',
  'image/gif',
  'image/jpeg',
  'image/png',
  'image/webp',
]);
const PRODUCT_SORTS = {
  featured: 'p.is_featured DESC, p.created_at DESC, p.id DESC',
  newest: 'p.created_at DESC, p.id DESC',
  price_asc: 'p.unit_price ASC, p.id DESC',
  price_desc: 'p.unit_price DESC, p.id DESC',
  rating: 'reviews.average_rating DESC NULLS LAST, reviews.review_count DESC, p.id DESC',
  name: 'p.name ASC, p.id DESC',
};
const ORDER_STATUSES = ['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'];
const ORDER_REVENUE_STATUSES = ['PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED'];
const ACTIVE_SHIPMENT_STATUSES = ['PENDING', 'PICKING', 'PACKED', 'IN_TRANSIT'];
const SHIPMENT_STATUS_TRANSITIONS = {
  PENDING: ['PENDING', 'PICKING', 'RETURNED'],
  PICKING: ['PICKING', 'PACKED', 'RETURNED'],
  PACKED: ['PACKED', 'IN_TRANSIT', 'RETURNED'],
  IN_TRANSIT: ['IN_TRANSIT', 'DELIVERED', 'RETURNED'],
  DELIVERED: ['DELIVERED', 'RETURNED'],
  RETURNED: ['RETURNED'],
};
const SHIPMENT_PROGRESS_BY_STATUS = {
  PENDING: 15,
  PICKING: 35,
  PACKED: 55,
  IN_TRANSIT: 80,
  DELIVERED: 100,
  RETURNED: 100,
};
const normalizeSlug = (value) =>
  normalizeText(value)
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
const normalizeCurrencyCode = (value, fallback = 'USD') => {
  const normalized = String(value || fallback)
    .trim()
    .toUpperCase();
  return normalized || fallback;
};
const normalizeUrl = (value) => {
  const normalizedValue = normalizeNullableText(value);
  if (!normalizedValue) {
    return null;
  }

  try {
    const parsedUrl = new URL(normalizedValue);
    return ['http:', 'https:'].includes(parsedUrl.protocol) ? parsedUrl.toString() : null;
  } catch (_error) {
    return null;
  }
};
const getFileExtension = (fileName, mimeType) => {
  const safeName = String(fileName || '').trim().toLowerCase();
  const explicitExtension = safeName.includes('.') ? safeName.split('.').pop() : '';
  const extensionMap = {
    'image/avif': 'avif',
    'image/gif': 'gif',
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
  };

  return explicitExtension && /^[a-z0-9]+$/.test(explicitExtension)
    ? explicitExtension
    : extensionMap[mimeType] || 'bin';
};
const normalizeAddressPayload = (address = {}, fallbackRecipientName = null) => ({
  label: normalizeNullableText(address.label),
  recipientName: normalizeNullableText(address.recipientName) || fallbackRecipientName || null,
  line1: normalizeText(address.line1),
  line2: normalizeNullableText(address.line2),
  city: normalizeText(address.city),
  stateRegion: normalizeNullableText(address.stateRegion),
  postalCode: normalizeNullableText(address.postalCode),
  country: normalizeText(address.country),
  phone: normalizeNullableText(address.phone),
});
const toDeliveryEtaTimestamp = (value) => {
  if (!value) {
    return null;
  }

  const isoDate = String(value).slice(0, 10);
  const parsed = new Date(`${isoDate}T18:00:00.000Z`);
  return Number.isNaN(parsed.getTime()) ? null : parsed.toISOString();
};
const buildTrackingUrl = (carrier, trackingNumber) => {
  if (!trackingNumber) {
    return null;
  }

  const encodedTrackingNumber = encodeURIComponent(trackingNumber);
  const normalizedCarrier = normalizeText(carrier).toLowerCase();

  if (normalizedCarrier.includes('dhl')) {
    return `https://www.dhl.com/global-en/home/tracking/tracking-express.html?tracking-id=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier.includes('fedex')) {
    return `https://www.fedex.com/fedextrack/?trknbr=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier.includes('ups')) {
    return `https://www.ups.com/track?tracknum=${encodedTrackingNumber}`;
  }

  if (normalizedCarrier.includes('aramex')) {
    return `https://www.aramex.com/track/results?ShipmentNumber=${encodedTrackingNumber}`;
  }

  return `https://www.google.com/search?q=${encodeURIComponent(`${carrier || 'shipment'} ${trackingNumber} tracking`)}`;
};
const buildShipmentTrackingSummary = ({ shipment, shipmentEvents = [], deliveryEta = null }) => {
  if (!shipment) {
    return null;
  }

  const latestEvent = shipmentEvents[0] || null;
  const estimatedDeliveryAt = shipment.estimated_delivery_at || toDeliveryEtaTimestamp(deliveryEta);
  const isDelivered = shipment.shipment_status === 'DELIVERED';
  const estimatedDeliveryTime = estimatedDeliveryAt ? new Date(estimatedDeliveryAt).getTime() : null;

  return {
    shipmentStatus: shipment.shipment_status,
    percentComplete: SHIPMENT_PROGRESS_BY_STATUS[shipment.shipment_status] || 0,
    isActive: ACTIVE_SHIPMENT_STATUSES.includes(shipment.shipment_status),
    isDelayed: Boolean(estimatedDeliveryTime) && !isDelivered && estimatedDeliveryTime < Date.now(),
    latestEventAt: latestEvent?.event_time || shipment.last_event_at || null,
    latestLocation: latestEvent?.location || shipment.last_known_location || null,
    estimatedDeliveryAt,
    trackingUrl: shipment.tracking_url || buildTrackingUrl(shipment.carrier, shipment.tracking_number),
    eventCount: shipmentEvents.length,
  };
};
const formatDiscountLabel = (campaign) =>
  campaign.discount_type === 'PERCENT'
    ? `${roundMoney(campaign.discount_value)}% off`
    : `${roundMoney(campaign.discount_value)} off`;
const normalizeLimit = (value, fallback = null) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  const parsed = asNumber(value, fallback ?? NaN);
  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, MAX_PRODUCT_LIMIT);
};
const normalizeOffset = (value, fallback = 0) => {
  const parsed = asNumber(value, fallback);
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback;
};
const resolveProductSort = (value) => PRODUCT_SORTS[String(value || '').toLowerCase()] || PRODUCT_SORTS.featured;
const deriveOrderStatusFromShipmentStatus = (shipmentStatus) => {
  if (shipmentStatus === 'PICKING' || shipmentStatus === 'PACKED') {
    return 'PROCESSING';
  }

  if (shipmentStatus === 'IN_TRANSIT') {
    return 'SHIPPED';
  }

  if (shipmentStatus === 'DELIVERED') {
    return 'DELIVERED';
  }

  return null;
};
const assertValidOrderStatus = (status) => {
  assert(ORDER_STATUSES.includes(status), `Unsupported order status ${status}.`, 400);
};
const assertValidShipmentTransition = (currentStatus, nextStatus) => {
  const allowedTransitions = SHIPMENT_STATUS_TRANSITIONS[currentStatus] || [];
  assert(allowedTransitions.includes(nextStatus), `Invalid shipment transition from ${currentStatus} to ${nextStatus}.`, 409);
};
const resolveSessionCapabilities = (currentUser) => {
  const roleName = currentUser?.role_name || '';
  return {
    canShop: Boolean(currentUser?.customer_id),
    canViewAnalytics: ['admin', 'inventory_manager', 'order_manager', 'marketing_manager', 'finance_manager', 'catalog_manager'].includes(roleName),
    canManageCatalog: ['admin', 'catalog_manager', 'marketing_manager'].includes(roleName),
    canManageOperations: ['admin', 'order_manager', 'inventory_manager', 'shipping_coordinator'].includes(roleName),
    canManagePeople: roleName === 'admin',
    canManageWarehouses: ['admin', 'inventory_manager'].includes(roleName),
    canManageExchangeRates: ['admin', 'finance_manager'].includes(roleName),
  };
};

const getBaseCurrencyCode = async (client = { query }) => {
  const result = await client.query(
    `
      SELECT code
      FROM currencies
      WHERE is_base = TRUE
      ORDER BY code ASC
      LIMIT 1
    `
  );

  return result.rows[0]?.code || 'USD';
};

const ensureCurrencyExists = async (currencyCode, client = { query }) => {
  const normalizedCurrencyCode = normalizeCurrencyCode(currencyCode);
  const result = await client.query('SELECT code FROM currencies WHERE code = $1 LIMIT 1', [normalizedCurrencyCode]);
  assert(result.rowCount > 0, `Currency ${normalizedCurrencyCode} is not configured.`, 400);
  return result.rows[0].code;
};

const getDirectExchangeRateRow = async ({ baseCurrencyCode, targetCurrencyCode, client = { query } }) => {
  const result = await client.query(
    `
      SELECT rate, effective_at
      FROM latest_exchange_rates
      WHERE base_currency_code = $1
        AND target_currency_code = $2
      LIMIT 1
    `,
    [normalizeCurrencyCode(baseCurrencyCode), normalizeCurrencyCode(targetCurrencyCode)]
  );

  return result.rows[0] || null;
};

const getLatestExchangeRate = async ({ fromCurrency, toCurrency, client = { query } }) => {
  const normalizedFromCurrency = normalizeCurrencyCode(fromCurrency);
  const normalizedToCurrency = normalizeCurrencyCode(toCurrency);

  if (normalizedFromCurrency === normalizedToCurrency) {
    return {
      rate: 1,
      effectiveAt: null,
      baseCurrencyCode: normalizedFromCurrency,
      targetCurrencyCode: normalizedToCurrency,
    };
  }

  const directRate = await getDirectExchangeRateRow({
    baseCurrencyCode: normalizedFromCurrency,
    targetCurrencyCode: normalizedToCurrency,
    client,
  });
  if (directRate) {
    return {
      rate: roundRate(directRate.rate),
      effectiveAt: directRate.effective_at,
      baseCurrencyCode: normalizedFromCurrency,
      targetCurrencyCode: normalizedToCurrency,
    };
  }

  const inverseRate = await getDirectExchangeRateRow({
    baseCurrencyCode: normalizedToCurrency,
    targetCurrencyCode: normalizedFromCurrency,
    client,
  });
  if (inverseRate) {
    return {
      rate: roundRate(1 / Number(inverseRate.rate)),
      effectiveAt: inverseRate.effective_at,
      baseCurrencyCode: normalizedFromCurrency,
      targetCurrencyCode: normalizedToCurrency,
    };
  }

  const baseCurrencyCode = await getBaseCurrencyCode(client);
  const baseToSourceRate = await getDirectExchangeRateRow({
    baseCurrencyCode,
    targetCurrencyCode: normalizedFromCurrency,
    client,
  });
  const baseToTargetRate = await getDirectExchangeRateRow({
    baseCurrencyCode,
    targetCurrencyCode: normalizedToCurrency,
    client,
  });

  assert(
    baseToSourceRate && baseToTargetRate,
    `Missing exchange rate path between ${normalizedFromCurrency} and ${normalizedToCurrency}.`,
    500
  );

  return {
    rate: roundRate(Number(baseToTargetRate.rate) / Number(baseToSourceRate.rate)),
    effectiveAt: baseToTargetRate.effective_at,
    baseCurrencyCode: normalizedFromCurrency,
    targetCurrencyCode: normalizedToCurrency,
  };
};

const createCurrencyConverter = ({ client = { query }, baseCurrencyCode = null } = {}) => {
  const rateCache = new Map();
  let resolvedBaseCurrencyCode = baseCurrencyCode;

  const loadBaseCurrencyCode = async () => {
    if (!resolvedBaseCurrencyCode) {
      resolvedBaseCurrencyCode = await getBaseCurrencyCode(client);
    }

    return resolvedBaseCurrencyCode;
  };

  const getRate = async (fromCurrency, toCurrency) => {
    const normalizedFromCurrency = normalizeCurrencyCode(fromCurrency);
    const normalizedToCurrency = normalizeCurrencyCode(toCurrency);
    const cacheKey = `${normalizedFromCurrency}:${normalizedToCurrency}`;

    if (!rateCache.has(cacheKey)) {
      rateCache.set(
        cacheKey,
        getLatestExchangeRate({
          fromCurrency: normalizedFromCurrency,
          toCurrency: normalizedToCurrency,
          client,
        })
      );
    }

    return rateCache.get(cacheKey);
  };

  return {
    getBaseCurrencyCode: loadBaseCurrencyCode,
    getRate,
    getRateToBase: async (fromCurrency) => {
      const resolvedBaseCode = await loadBaseCurrencyCode();
      const exchangeRate = await getRate(fromCurrency, resolvedBaseCode);
      return {
        ...exchangeRate,
        baseCurrencyCode: resolvedBaseCode,
      };
    },
    convert: async (amount, fromCurrency, toCurrency) => {
      const numericAmount = Number(amount || 0);
      if (!Number.isFinite(numericAmount) || numericAmount === 0) {
        return 0;
      }

      const exchangeRate = await getRate(fromCurrency, toCurrency);
      return roundMoney(numericAmount * Number(exchangeRate.rate || 1));
    },
  };
};

const refreshAnalyticsSnapshots = async (client = { query }) => {
  await client.query('REFRESH MATERIALIZED VIEW weekly_category_sales_snapshot');
};

const normalizePlatformSettingValue = (value) => {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value === 'object') {
    return value;
  }

  return value;
};

const getPlatformSettings = async () => {
  const result = await query(
    `
      SELECT key, value_json, description, updated_at
      FROM platform_settings
      ORDER BY key ASC
    `
  );

  return result.rows.map((row) => ({
    ...row,
    value: normalizePlatformSettingValue(row.value_json),
  }));
};

const getOperationalSettings = async () => {
  const settings = await getPlatformSettings();
  const settingMap = settings.reduce((accumulator, setting) => {
    accumulator[setting.key] = setting.value;
    return accumulator;
  }, {});

  const configuredTaxRate = Number(settingMap.tax_rate);
  const configuredFreeShippingThreshold = Number(settingMap.free_shipping_threshold);

  return {
    settings,
    taxRate: Number.isFinite(configuredTaxRate) ? configuredTaxRate : config.taxRate,
    freeShippingThreshold: Number.isFinite(configuredFreeShippingThreshold)
      ? configuredFreeShippingThreshold
      : config.freeShippingThreshold,
  };
};

const applySellerDiscountsToProducts = async (products = []) => {
  return products.map((product) => ({
    ...product,
    original_unit_price: Number(product.unit_price || 0),
    discount_amount: 0,
    discount_label: null,
    active_discount: null,
  }));
};

const getProductPricingSnapshot = async ({ productId, quantity = 1, client = { query } }) => {
  const product = await client.query(
    `
      SELECT id, category_id, unit_price, currency_code, status
      FROM products
      WHERE id = $1
      LIMIT 1
    `,
    [productId]
  );

  assert(product.rowCount > 0 && product.rows[0].status === 'ACTIVE', 'Product not found.', 404);

  const [discounted] = await applySellerDiscountsToProducts(product.rows);

  return discounted;
};

const buildProductFilters = (requestQuery = {}) => {
  const where = ["p.status = 'ACTIVE'"];
  const params = [];
  const searchTerm = normalizeText(requestQuery.q);

  if (requestQuery.featured === 'true') {
    where.push('p.is_featured = TRUE');
  }

  if (requestQuery.category) {
    params.push(requestQuery.category);
    where.push(`c.slug = $${params.length}`);
  }

  if (requestQuery.inStock === 'true') {
    where.push('EXISTS (SELECT 1 FROM inventory i WHERE i.product_id = p.id AND i.quantity_on_hand > 0)');
  }

  if (requestQuery.minPrice) {
    const min = Number(requestQuery.minPrice);
    if (Number.isFinite(min) && min >= 0) {
      params.push(min);
      where.push(`p.unit_price >= $${params.length}`);
    }
  }

  if (requestQuery.maxPrice) {
    const max = Number(requestQuery.maxPrice);
    if (Number.isFinite(max) && max >= 0) {
      params.push(max);
      where.push(`p.unit_price <= $${params.length}`);
    }
  }

  if (searchTerm) {
    params.push(`%${searchTerm}%`);
    where.push(`(p.name ILIKE $${params.length} OR p.short_description ILIKE $${params.length} OR c.name ILIKE $${params.length})`);
  }

  return { where: where.join(' AND '), params };
};

const listProducts = async (requestQuery = {}) => {
  const filters = buildProductFilters(requestQuery);
  const sortClause = resolveProductSort(requestQuery.sort);
  const limit = normalizeLimit(requestQuery.limit, MAX_PRODUCT_LIMIT) || MAX_PRODUCT_LIMIT;
  const offset = normalizeOffset(requestQuery.offset, 0);
  const params = [...filters.params, limit, offset];
  const result = await query(
    `
      SELECT
        p.id, p.category_id, p.sku, p.name, p.slug, p.short_description, p.long_description,
        p.unit_price, p.currency_code, p.status, p.is_featured, p.launch_month,
        c.name AS category_name, c.slug AS category_slug,
        COALESCE(image.public_url, image.source_url) AS image_url,
        COALESCE(stock.available_units, 0) AS available_units,
        COALESCE(reviews.average_rating, 0) AS average_rating,
        COALESCE(reviews.review_count, 0) AS review_count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (
        SELECT public_url, source_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC, id ASC
        LIMIT 1
      ) image ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(quantity_on_hand)::integer AS available_units
        FROM inventory
        WHERE product_id = p.id
      ) stock ON TRUE
      LEFT JOIN LATERAL (
        SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::integer AS review_count
        FROM product_reviews
        WHERE product_id = p.id
      ) reviews ON TRUE
      WHERE ${filters.where}
      ORDER BY ${sortClause}
      LIMIT $${params.length - 1}
      OFFSET $${params.length}
    `,
    params
  );

  const pricedProducts = await applySellerDiscountsToProducts(result.rows);
  return pricedProducts.map((row) =>
    mapMoneyRow(row, ['unit_price', 'original_unit_price', 'discount_amount', 'average_rating'])
  );
};

const getProductDetail = async (slug) => {
  const result = await query(
    `
      SELECT
        p.id, p.category_id, p.sku, p.name, p.slug, p.short_description, p.long_description,
        p.unit_price, p.currency_code, p.status, p.is_featured, p.launch_month,
        c.name AS category_name, c.slug AS category_slug,
        COALESCE(stock.available_units, 0) AS available_units,
        COALESCE(reviews.average_rating, 0) AS average_rating,
        COALESCE(reviews.review_count, 0) AS review_count
      FROM products p
      JOIN categories c ON c.id = p.category_id
      LEFT JOIN LATERAL (SELECT SUM(quantity_on_hand)::integer AS available_units FROM inventory WHERE product_id = p.id) stock ON TRUE
      LEFT JOIN LATERAL (SELECT ROUND(AVG(rating)::numeric, 1) AS average_rating, COUNT(*)::integer AS review_count FROM product_reviews WHERE product_id = p.id) reviews ON TRUE
      WHERE p.slug = $1
      LIMIT 1
    `,
    [slug]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const [discountedProduct] = await applySellerDiscountsToProducts(result.rows);
  const product = mapMoneyRow(discountedProduct, ['unit_price', 'original_unit_price', 'discount_amount', 'average_rating']);
  const [images, attributes, reviews, related] = await Promise.all([
    query('SELECT id, public_url, source_url, object_path, alt_text, is_primary, display_order FROM product_images WHERE product_id = $1 ORDER BY is_primary DESC, display_order ASC, id ASC', [product.id]),
    query('SELECT pa.name, pa.display_name, pav.value_text FROM product_attribute_values pav JOIN product_attributes pa ON pa.id = pav.attribute_id WHERE pav.product_id = $1 ORDER BY pa.display_name', [product.id]),
    query("SELECT pr.id, pr.rating, pr.title, pr.body, pr.is_verified_purchase, pr.created_at, CONCAT(c.first_name, ' ', c.last_name) AS customer_name FROM product_reviews pr JOIN customers c ON c.id = pr.customer_id WHERE pr.product_id = $1 ORDER BY pr.created_at DESC LIMIT 5", [product.id]),
    query("SELECT p.id, p.slug, p.name, p.short_description, p.unit_price, p.currency_code, p.category_id, COALESCE(image.public_url, image.source_url) AS image_url FROM products p LEFT JOIN LATERAL (SELECT public_url, source_url FROM product_images WHERE product_id = p.id ORDER BY is_primary DESC, display_order ASC LIMIT 1) image ON TRUE WHERE p.category_id = $1 AND p.id <> $2 AND p.status = 'ACTIVE' ORDER BY p.is_featured DESC, p.created_at DESC LIMIT 4", [product.category_id, product.id]),
  ]);

  const relatedProducts = await applySellerDiscountsToProducts(related.rows);

  return {
    ...product,
    images: images.rows.map((image) => ({ ...image, url: buildImageUrl(image) })),
    attributes: attributes.rows,
    reviews: reviews.rows.map((review) => mapMoneyRow(review, ['rating'])),
    relatedProducts: relatedProducts.map((item) =>
      mapMoneyRow(item, ['unit_price', 'original_unit_price', 'discount_amount'])
    ),
  };
};

const getCustomerProfile = async (customerId) => {
  const [customer, addresses, recentOrders, wishlistCountResult, wishlistPreview, recommendedProducts, nextTier] = await Promise.all([
    query(
      `
        SELECT
          c.id,
          c.company_name,
          c.first_name,
          c.last_name,
          c.email,
          c.phone,
          c.city,
          c.country,
          c.lifetime_value,
          ct.name AS tier_name,
          ct.discount_rate,
          ct.min_lifetime_value
        FROM customers c
        JOIN customer_tiers ct ON ct.id = c.tier_id
        WHERE c.id = $1
        LIMIT 1
      `,
      [customerId]
    ),
    query(
      `
        SELECT
          id,
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
        FROM customer_addresses
        WHERE customer_id = $1
        ORDER BY is_default_shipping DESC, created_at DESC
      `,
      [customerId]
    ),
    query(
      `
        SELECT order_number, order_status, total_amount, currency_code, placed_at, delivery_eta
        FROM orders
        WHERE customer_id = $1
        ORDER BY placed_at DESC
        LIMIT 6
      `,
      [customerId]
    ),
    query(
      `
        SELECT COUNT(*)::integer AS wishlist_count
        FROM wishlists
        WHERE customer_id = $1
      `,
      [customerId]
    ),
    query(
      `
        SELECT
          p.id,
          p.slug,
          p.name,
          p.short_description,
          p.unit_price,
          p.currency_code,
          p.category_id,
          COALESCE(image.public_url, image.source_url) AS image_url
        FROM wishlists w
        JOIN products p ON p.id = w.product_id
        LEFT JOIN LATERAL (
          SELECT public_url, source_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) image ON TRUE
        WHERE w.customer_id = $1
          AND p.status = 'ACTIVE'
        ORDER BY w.added_at DESC
        LIMIT 4
      `,
      [customerId]
    ),
    query(
      `
        WITH affinity AS (
          SELECT p.category_id, COUNT(*)::integer AS score
          FROM orders o
          JOIN order_items oi ON oi.order_id = o.id
          JOIN products p ON p.id = oi.product_id
          WHERE o.customer_id = $1
          GROUP BY p.category_id
          UNION ALL
          SELECT p.category_id, 1::integer AS score
          FROM wishlists w
          JOIN products p ON p.id = w.product_id
          WHERE w.customer_id = $1
        ),
        scored_categories AS (
          SELECT category_id, SUM(score)::integer AS affinity_score
          FROM affinity
          GROUP BY category_id
        )
        SELECT
          p.id,
          p.slug,
          p.name,
          p.short_description,
          p.unit_price,
          p.currency_code,
          p.category_id,
          COALESCE(image.public_url, image.source_url) AS image_url,
          COALESCE(sc.affinity_score, 0) AS affinity_score
        FROM products p
        LEFT JOIN scored_categories sc ON sc.category_id = p.category_id
        LEFT JOIN LATERAL (
          SELECT public_url, source_url
          FROM product_images
          WHERE product_id = p.id
          ORDER BY is_primary DESC, display_order ASC
          LIMIT 1
        ) image ON TRUE
        WHERE p.status = 'ACTIVE'
          AND NOT EXISTS (
            SELECT 1
            FROM wishlists w
            WHERE w.customer_id = $1
              AND w.product_id = p.id
          )
        ORDER BY COALESCE(sc.affinity_score, 0) DESC, p.is_featured DESC, p.created_at DESC, p.id DESC
        LIMIT 4
      `,
      [customerId]
    ),
    query(
      `
        SELECT name, discount_rate, min_lifetime_value
        FROM customer_tiers
        WHERE min_lifetime_value > COALESCE(
          (SELECT lifetime_value FROM customers WHERE id = $1),
          0
        )
        ORDER BY min_lifetime_value ASC, id ASC
        LIMIT 1
      `,
      [customerId]
    ),
  ]);

  const currentCustomer = customer.rows[0] ? mapMoneyRow(customer.rows[0], ['lifetime_value', 'discount_rate', 'min_lifetime_value']) : null;
  const discountedWishlistPreview = await applySellerDiscountsToProducts(wishlistPreview.rows);
  const discountedRecommendations = await applySellerDiscountsToProducts(recommendedProducts.rows);

  const profileFields = [
    currentCustomer?.first_name,
    currentCustomer?.last_name,
    currentCustomer?.email,
    currentCustomer?.phone,
    currentCustomer?.city,
    currentCustomer?.country,
  ];
  const completedProfileFields = profileFields.filter((value) => Boolean(String(value || '').trim())).length;
  const nextTierRow = nextTier.rows[0]
    ? mapMoneyRow(nextTier.rows[0], ['discount_rate', 'min_lifetime_value'])
    : null;

  return {
    customer: currentCustomer,
    addresses: addresses.rows,
    recentOrders: recentOrders.rows.map((row) => mapMoneyRow(row, ['total_amount'])),
    wishlistSummary: {
      count: Number(wishlistCountResult.rows[0]?.wishlist_count || 0),
      items: discountedWishlistPreview.map((row) =>
        mapMoneyRow(row, ['unit_price', 'original_unit_price', 'discount_amount'])
      ),
    },
    recommendations: discountedRecommendations.map((row) =>
      mapMoneyRow(row, ['unit_price', 'original_unit_price', 'discount_amount'])
    ),
    loyaltyJourney: nextTierRow
      ? {
          nextTier: nextTierRow.name,
          nextTierDiscountRate: nextTierRow.discount_rate,
          amountRemaining: roundMoney(Math.max(0, Number(nextTierRow.min_lifetime_value || 0) - Number(currentCustomer?.lifetime_value || 0))),
          targetLifetimeValue: nextTierRow.min_lifetime_value,
        }
      : null,
    profileCompleteness: {
      completedFields: completedProfileFields,
      totalFields: profileFields.length,
      percent: Math.round((completedProfileFields / profileFields.length) * 100),
    },
  };
};

const assertRequestedInventoryAvailable = async ({ productId, quantity, client = { query } }) => {
  const inventory = await client.query(
    `
      SELECT p.name, COALESCE(SUM(i.quantity_on_hand), 0)::integer AS available_units
      FROM products p
      LEFT JOIN inventory i ON i.product_id = p.id
      WHERE p.id = $1
      GROUP BY p.id, p.name
      LIMIT 1
    `,
    [productId]
  );

  assert(inventory.rowCount > 0, 'Product not found.', 404);
  assert(
    Number(inventory.rows[0].available_units) >= quantity,
    `${inventory.rows[0].name} only has ${inventory.rows[0].available_units} units available.`,
    409
  );

  return inventory.rows[0];
};

const lockWarehouseInventoryForOrder = async ({ items = [], client }) => {
  const normalizedItems = items
    .map((item) => ({
      product_id: Number(item.product_id),
      quantity: Number(item.quantity),
      name: item.name,
    }))
    .filter((item) => Number.isInteger(item.product_id) && Number.isInteger(item.quantity) && item.quantity > 0);

  assert(normalizedItems.length > 0, 'Cart is empty.');

  const inventoryRows = await client.query(
    `
      SELECT
        i.product_id,
        i.warehouse_id,
        i.quantity_on_hand,
        p.name AS product_name,
        w.name AS warehouse_name
      FROM inventory i
      JOIN products p ON p.id = i.product_id
      JOIN warehouses w ON w.id = i.warehouse_id
      WHERE i.product_id = ANY($1::int[])
      ORDER BY i.warehouse_id ASC, i.product_id ASC
      FOR UPDATE
    `,
    [[...new Set(normalizedItems.map((item) => item.product_id))]]
  );

  const warehouseInventory = new Map();
  const totalInventoryByProduct = new Map();

  for (const row of inventoryRows.rows) {
    const warehouseEntry = warehouseInventory.get(row.warehouse_id) || {
      warehouseId: row.warehouse_id,
      warehouseName: row.warehouse_name,
      totalAvailableUnits: 0,
      quantitiesByProduct: new Map(),
    };

    warehouseEntry.quantitiesByProduct.set(Number(row.product_id), Number(row.quantity_on_hand));
    warehouseEntry.totalAvailableUnits += Number(row.quantity_on_hand);
    warehouseInventory.set(row.warehouse_id, warehouseEntry);

    totalInventoryByProduct.set(
      Number(row.product_id),
      (totalInventoryByProduct.get(Number(row.product_id)) || 0) + Number(row.quantity_on_hand)
    );
  }

  const eligibleWarehouses = [...warehouseInventory.values()].filter((warehouse) =>
    normalizedItems.every((item) => (warehouse.quantitiesByProduct.get(item.product_id) || 0) >= item.quantity)
  );

  if (eligibleWarehouses.length === 0) {
    const inventorySummary = normalizedItems
      .map((item) => {
        const totalAvailable = totalInventoryByProduct.get(item.product_id) || 0;

        if (totalAvailable < item.quantity) {
          return `${item.name || `Product ${item.product_id}`} only has ${totalAvailable} units available.`;
        }

        return `${item.name || `Product ${item.product_id}`} has stock, but not enough from a single warehouse.`;
      })
      .join(' ');

    assert(false, `Unable to allocate inventory for this order. ${inventorySummary}`, 409);
  }

  eligibleWarehouses.sort((left, right) => {
    if (right.totalAvailableUnits !== left.totalAvailableUnits) {
      return right.totalAvailableUnits - left.totalAvailableUnits;
    }

    return left.warehouseId - right.warehouseId;
  });

  return eligibleWarehouses[0];
};

const ensureActiveCart = async (customerId, client = { query }, options = {}) => {
  const preferredCurrencyCode = options.preferredCurrencyCode
    ? await ensureCurrencyExists(options.preferredCurrencyCode, client)
    : null;
  const existing = await client.query('SELECT id, customer_id, currency_code FROM carts WHERE customer_id = $1 AND status = $2 LIMIT 1', [customerId, 'ACTIVE']);
  if (existing.rowCount > 0) {
    if (preferredCurrencyCode && existing.rows[0].currency_code !== preferredCurrencyCode) {
      const updated = await client.query(
        'UPDATE carts SET currency_code = $1, updated_at = NOW() WHERE id = $2 RETURNING id, customer_id, currency_code',
        [preferredCurrencyCode, existing.rows[0].id]
      );
      return updated.rows[0];
    }

    return existing.rows[0];
  }

  const baseCurrencyCode = preferredCurrencyCode || (await getBaseCurrencyCode(client));
  const inserted = await client.query("INSERT INTO carts (customer_id, currency_code, status) SELECT id, $2, 'ACTIVE' FROM customers WHERE id = $1 RETURNING id, customer_id, currency_code", [customerId, baseCurrencyCode]);
  return inserted.rows[0];
};

const getCart = async (customerId, options = {}) => {
  const client = options.client || { query };
  const cart = await ensureActiveCart(customerId, client, {
    preferredCurrencyCode: options.currencyCode,
  });
  const converter = createCurrencyConverter({ client });
  const items = await client.query(
    `
      SELECT
        ci.id, ci.product_id, ci.quantity, ci.currency_code AS item_currency_code, ci.original_unit_price, ci.unit_price, ci.discount_amount, ci.discount_label,
        (ci.quantity * ci.unit_price) AS line_total,
        (ci.quantity * ci.original_unit_price) AS original_line_total,
        p.name, p.slug, p.short_description, p.currency_code AS product_currency_code, p.category_id,
        COALESCE(image.public_url, image.source_url) AS image_url,
        COALESCE(stock.available_units, 0) AS available_units
      FROM cart_items ci
      JOIN products p ON p.id = ci.product_id
      LEFT JOIN LATERAL (
        SELECT public_url, source_url
        FROM product_images
        WHERE product_id = p.id
        ORDER BY is_primary DESC, display_order ASC
        LIMIT 1
      ) image ON TRUE
      LEFT JOIN LATERAL (
        SELECT SUM(quantity_on_hand)::integer AS available_units
        FROM inventory
        WHERE product_id = p.id
      ) stock ON TRUE
      WHERE ci.cart_id = $1
      ORDER BY ci.created_at DESC
    `,
    [cart.id]
  );

  const convertedItems = await Promise.all(
    items.rows.map(async (item) => {
      const sourceCurrencyCode = normalizeCurrencyCode(item.item_currency_code || item.product_currency_code || cart.currency_code);
      const [originalUnitPrice, unitPrice, discountAmount, lineTotal, originalLineTotal] = await Promise.all([
        converter.convert(item.original_unit_price, sourceCurrencyCode, cart.currency_code),
        converter.convert(item.unit_price, sourceCurrencyCode, cart.currency_code),
        converter.convert(item.discount_amount, sourceCurrencyCode, cart.currency_code),
        converter.convert(item.line_total, sourceCurrencyCode, cart.currency_code),
        converter.convert(item.original_line_total, sourceCurrencyCode, cart.currency_code),
      ]);

      return mapMoneyRow(
        {
          ...item,
          currency_code: cart.currency_code,
          product_currency_code: sourceCurrencyCode,
          original_unit_price: originalUnitPrice,
          unit_price: unitPrice,
          discount_amount: discountAmount,
          line_total: lineTotal,
          original_line_total: originalLineTotal,
        },
        ['original_unit_price', 'unit_price', 'discount_amount', 'line_total', 'original_line_total']
      );
    })
  );

  const subtotal = convertedItems.reduce((sum, item) => sum + Number(item.line_total), 0);
  const originalSubtotal = convertedItems.reduce((sum, item) => sum + Number(item.original_line_total), 0);

  return {
    id: cart.id,
    customer_id: cart.customer_id,
    currency_code: cart.currency_code,
    items: convertedItems,
    itemCount: convertedItems.reduce((sum, item) => sum + Number(item.quantity), 0),
    originalSubtotal: roundMoney(originalSubtotal),
    sellerDiscountTotal: 0,
    subtotal: roundMoney(subtotal),
  };
};

const getPromotion = async (code) => {
  if (!code) {
    return null;
  }

  const result = await query(
    `
      SELECT code, title, description, discount_type, discount_value, minimum_order_amount
      FROM promotions
      WHERE code = UPPER($1) AND is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
      LIMIT 1
    `,
    [code]
  );

  return result.rows[0] ? mapMoneyRow(result.rows[0], ['discount_value', 'minimum_order_amount']) : null;
};

const calculateQuote = async (customerId, payload = {}, options = {}) => {
  const client = options.client || { query };
  const converter = createCurrencyConverter({ client });
  const shippingMethods = await getShippingMethods();
  const cart = await getCart(customerId, {
    client,
    currencyCode: payload.currencyCode,
  });
  const profile = await getCustomerProfile(customerId);
  const operationalSettings = await getOperationalSettings();
  const baseCurrencyCode = await converter.getBaseCurrencyCode();
  const shippingMethodTemplate = shippingMethods.find((method) => method.id === payload.shippingMethod) || shippingMethods[0];
  const shippingMethodAmount = await converter.convert(
    shippingMethodTemplate?.amount || 0,
    baseCurrencyCode,
    cart.currency_code
  );
  const shippingMethod = shippingMethodTemplate
    ? {
        ...shippingMethodTemplate,
        amount: shippingMethodAmount,
        base_amount: roundMoney(shippingMethodTemplate.amount),
      }
    : null;
  assert(shippingMethod, 'No shipping methods are configured.', 500);

  const promotion = await getPromotion(payload.promoCode);
  const promotionMinimumOrderAmount = promotion
    ? await converter.convert(promotion.minimum_order_amount, baseCurrencyCode, cart.currency_code)
    : 0;
  const promotionDiscountValue = promotion
    ? await converter.convert(promotion.discount_value, baseCurrencyCode, cart.currency_code)
    : 0;
  const tierDiscountRate = Number(profile.customer?.discount_rate || 0) / 100;
  const tierDiscount = roundMoney(cart.subtotal * tierDiscountRate);

  let promoDiscount = 0;
  if (promotion && cart.subtotal >= Number(promotionMinimumOrderAmount || 0)) {
    if (promotion.discount_type === 'PERCENT') {
      promoDiscount = roundMoney(cart.subtotal * (Number(promotion.discount_value) / 100));
    } else if (promotion.discount_type === 'FIXED') {
      promoDiscount = roundMoney(Number(promotionDiscountValue));
    }
  }

  const freeShippingThreshold = await converter.convert(
    operationalSettings.freeShippingThreshold,
    baseCurrencyCode,
    cart.currency_code
  );
  let shippingAmount = Number(shippingMethod.amount);
  if (cart.subtotal >= freeShippingThreshold && shippingMethod.id === 'standard') {
    shippingAmount = 0;
  }
  if (promotion && promotion.discount_type === 'SHIPPING') {
    shippingAmount = Math.max(0, shippingAmount - Number(promotionDiscountValue || 0));
  }

  const discountedSubtotal = Math.max(0, cart.subtotal - tierDiscount - promoDiscount);
  const taxAmount = roundMoney(discountedSubtotal * operationalSettings.taxRate);
  const totalAmount = roundMoney(discountedSubtotal + shippingAmount + taxAmount);
  const exchangeRateToBase = await converter.getRateToBase(cart.currency_code);

  const [
    baseSubtotalAmount,
    baseTierDiscountAmount,
    basePromoDiscountAmount,
    baseShippingAmount,
    baseTaxAmount,
    baseTotalAmount,
  ] = await Promise.all([
    converter.convert(cart.originalSubtotal, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
    converter.convert(tierDiscount, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
    converter.convert(promoDiscount, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
    converter.convert(shippingAmount, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
    converter.convert(taxAmount, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
    converter.convert(totalAmount, cart.currency_code, exchangeRateToBase.baseCurrencyCode),
  ]);

  return {
    cart,
    customer: profile.customer,
    addresses: profile.addresses,
    operationalSettings: {
      taxRate: operationalSettings.taxRate,
      freeShippingThreshold: operationalSettings.freeShippingThreshold,
    },
    promotion,
    shippingMethod,
    orderCurrencyCode: cart.currency_code,
    baseCurrencyCode: exchangeRateToBase.baseCurrencyCode,
    exchangeRateToBase: exchangeRateToBase.rate,
    exchangeRateEffectiveAt: exchangeRateToBase.effectiveAt,
    originalSubtotalAmount: cart.originalSubtotal,
    subtotalAmount: cart.subtotal,
    tierDiscountAmount: tierDiscount,
    promoDiscountAmount: promoDiscount,
    shippingAmount: roundMoney(shippingAmount),
    taxAmount,
    totalAmount,
    baseSubtotalAmount,
    baseTierDiscountAmount,
    basePromoDiscountAmount,
    baseDiscountAmount: roundMoney(baseTierDiscountAmount + basePromoDiscountAmount),
    baseShippingAmount,
    baseTaxAmount,
    baseTotalAmount,
  };
};

const getOpenReorderQueue = async (limit = 6) => {
  const result = await query(
    `
      SELECT
        rr.id,
        rr.product_id,
        p.name AS product_name,
        rr.warehouse_id,
        w.name AS warehouse_name,
        rr.quantity_requested,
        rr.quantity_on_hand,
        rr.reorder_point,
        rr.status,
        rr.trigger_source,
        rr.note,
        rr.created_at
      FROM reorder_requests rr
      JOIN products p ON p.id = rr.product_id
      JOIN warehouses w ON w.id = rr.warehouse_id
      WHERE rr.status = 'OPEN'
      ORDER BY rr.created_at DESC, rr.id DESC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows;
};

const getAdvancedAnalyticsReport = async () => {
  const baseCurrencyCode = await getBaseCurrencyCode();
  const [exchangeRates, weeklyCategorySales, productRankings, customerTierMatrix, priceHistory, customerFirstOrders] = await Promise.all([
    getExchangeRates(),
    query(
      `
        SELECT
          category_id,
          category_name,
          week_start,
          year_week,
          total_revenue_usd,
          units_sold,
          order_count
        FROM weekly_category_sales_snapshot
        ORDER BY week_start DESC, total_revenue_usd DESC, category_name ASC
        LIMIT 8
      `
    ),
    query(
      `
        SELECT
          category_id,
          category_name,
          product_id,
          product_name,
          total_sold,
          rank_in_category,
          dense_rank_in_category
        FROM product_sales_rankings
        ORDER BY total_sold DESC, category_name ASC, product_name ASC
        LIMIT 8
      `
    ),
    query(
      `
        SELECT
          customer_id,
          customer_name,
          tier_name,
          lifetime_value,
          rank_in_tier,
          dense_rank_overall,
          lifetime_value_decile
        FROM customer_value_insights
        ORDER BY lifetime_value DESC, customer_name ASC
        LIMIT 8
      `
    ),
    query(
      `
        SELECT
          product_id,
          product_name,
          currency_code,
          changed_at,
          new_price,
          lag_price,
          next_price,
          price_change,
          first_price,
          latest_price
        FROM price_history_insights
        ORDER BY changed_at DESC, product_name ASC
        LIMIT 8
      `
    ),
    query(
      `
        SELECT customer_id, customer_name, order_number, placed_at
        FROM (
          SELECT
            o.customer_id,
            CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
            o.order_number,
            o.placed_at,
            ROW_NUMBER() OVER (PARTITION BY o.customer_id ORDER BY o.placed_at ASC, o.id ASC) AS rn
          FROM orders o
          JOIN customers c ON c.id = o.customer_id
          WHERE o.order_status = ANY($1::text[])
        ) ranked
        WHERE rn = 1
        ORDER BY placed_at ASC, customer_name ASC
        LIMIT 6
      `,
      [ORDER_REVENUE_STATUSES]
    ),
  ]);

  return {
    baseCurrencyCode,
    exchangeRates,
    weeklyCategorySales: weeklyCategorySales.rows.map((row) => mapMoneyRow(row, ['total_revenue_usd'])),
    productRankings: productRankings.rows,
    customerTierMatrix: customerTierMatrix.rows.map((row) => mapMoneyRow(row, ['lifetime_value'])),
    priceHistory: priceHistory.rows.map((row) =>
      mapNullableMoneyRow(row, ['new_price', 'lag_price', 'next_price', 'price_change', 'first_price', 'latest_price'])
    ),
    customerFirstOrders: customerFirstOrders.rows,
  };
};

const getAdminDashboard = async () => {
  const [overview, lowStock, recentOrders, topProducts, platformSettings, reorderQueue, analytics, userDirectory, teamOverview, warehouseNetwork, exchangeRateSync, activityFeed] = await Promise.all([
    query(
      `
        SELECT
          COUNT(*)::integer AS product_count,
          SUM(CASE WHEN status = 'ACTIVE' THEN 1 ELSE 0 END)::integer AS active_products,
          SUM(CASE WHEN is_featured = TRUE THEN 1 ELSE 0 END)::integer AS featured_products,
          (SELECT COUNT(*)::integer FROM orders WHERE placed_at >= NOW() - INTERVAL '30 days') AS monthly_orders,
          (
            SELECT COALESCE(SUM(base_total_amount), 0)
            FROM orders
            WHERE placed_at >= NOW() - INTERVAL '30 days'
              AND order_status = ANY($1::text[])
          ) AS monthly_revenue,
          (SELECT code FROM currencies WHERE is_base = TRUE ORDER BY code ASC LIMIT 1) AS base_currency_code,
          (
            SELECT COUNT(*)::integer
            FROM promotions
            WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW()
          ) AS active_promotions,
          (
            SELECT COUNT(*)::integer
            FROM shipments
            WHERE shipment_status IN ('PENDING', 'PICKING', 'PACKED', 'IN_TRANSIT')
          ) AS active_shipments
        FROM products
      `,
      [ORDER_REVENUE_STATUSES]
    ),
    query('SELECT p.id, p.name, p.slug, SUM(i.quantity_on_hand)::integer AS available_units, MIN(i.reorder_point)::integer AS reorder_point FROM products p JOIN inventory i ON i.product_id = p.id GROUP BY p.id HAVING SUM(i.quantity_on_hand) <= MIN(i.reorder_point) + 8 ORDER BY available_units ASC LIMIT 6'),
    query("SELECT o.id, o.order_number, o.order_status, o.total_amount, o.currency_code, o.placed_at, CONCAT(c.first_name, ' ', c.last_name) AS customer_name FROM orders o JOIN customers c ON c.id = o.customer_id ORDER BY o.placed_at DESC LIMIT 6"),
    query('SELECT product_name AS name, total_sold AS units_sold, category_name, rank_in_category FROM product_sales_rankings ORDER BY total_sold DESC, product_name ASC LIMIT 5'),
    getPlatformSettings(),
    getOpenReorderQueue(),
    getAdvancedAnalyticsReport(),
    listManagedUsers({ limit: 50 }),
    query(
      `
        SELECT
          COUNT(*)::integer AS total_users,
          COUNT(*) FILTER (WHERE is_active = TRUE)::integer AS active_users,
          COUNT(*) FILTER (WHERE role_id = (SELECT id FROM roles WHERE name = 'customer' LIMIT 1))::integer AS customer_count
        FROM users
      `
    ),
    listWarehouses(),
    getExchangeRateSyncStatus(),
    listAdminActivity({ limit: 14 }),
  ]);

  const activeUsers = Number(teamOverview.rows[0]?.active_users || 0);
  const customerCount = Number(teamOverview.rows[0]?.customer_count || 0);
  const staffCount = Math.max(0, Number(teamOverview.rows[0]?.total_users || 0) - customerCount);
  const activeWarehouses = warehouseNetwork.filter((warehouse) => warehouse.is_active).length;
  const warehouseAlerts = warehouseNetwork.reduce((sum, warehouse) => sum + Number(warehouse.alert_skus || 0), 0);

  return {
    overview: overview.rows[0]
      ? mapMoneyRow(
          {
            ...overview.rows[0],
            active_users: activeUsers,
            customer_count: customerCount,
            staff_count: staffCount,
            active_warehouses: activeWarehouses,
            warehouse_alerts: warehouseAlerts,
          },
          ['monthly_revenue']
        )
      : null,
    lowStock: lowStock.rows,
    recentOrders: recentOrders.rows.map((row) => mapMoneyRow(row, ['total_amount'])),
    topProducts: topProducts.rows,
    platformSettings,
    reorderQueue,
    analytics,
    userDirectory,
    warehouseNetwork,
    activityFeed,
    externalServices: {
      storage: getStorageStatus(),
      exchangeRates: exchangeRateSync,
    },
  };
};

const getOperationsDashboard = async () => {
  const [shipmentFeed, warehouses, shipmentEvents, reorderQueue, exchangeRateSync, activityFeed] = await Promise.all([
    listShipments({ limit: 8 }),
    listWarehouses(),
    query('SELECT se.status, se.event_code, se.location, se.note, se.is_public, se.metadata, se.event_time, s.tracking_number FROM shipment_events se JOIN shipments s ON s.id = se.shipment_id ORDER BY se.event_time DESC LIMIT 10'),
    getOpenReorderQueue(),
    getExchangeRateSyncStatus(),
    listAdminActivity({ limit: 14 }),
  ]);

  return {
    overview: shipmentFeed.overview,
    shipments: shipmentFeed.items,
    warehouses,
    shipmentEvents: shipmentEvents.rows,
    reorderQueue,
    activityFeed,
    externalServices: {
      exchangeRates: exchangeRateSync,
    },
  };
};

const getHomeData = async () => {
  const [products, categories, orderPipeline, warehouses, testimonials, heroEyebrows, valueProps] = await Promise.all([
    listProducts({ featured: 'true' }),
    query('SELECT id, name, slug, description, hero_copy FROM categories WHERE is_featured = TRUE ORDER BY created_at DESC LIMIT 4'),
    query('SELECT order_status AS label, COUNT(*)::integer AS value FROM orders GROUP BY order_status ORDER BY COUNT(*) DESC, order_status'),
    query('SELECT w.id, w.code, w.name, w.city, w.country, w.capacity_units, COALESCE(SUM(i.quantity_on_hand), 0)::integer AS utilized_units FROM warehouses w LEFT JOIN inventory i ON i.warehouse_id = w.id GROUP BY w.id ORDER BY utilized_units DESC'),
    query("SELECT pr.rating, pr.title, pr.body, CONCAT(c.first_name, ' ', c.last_name) AS customer_name FROM product_reviews pr JOIN customers c ON c.id = pr.customer_id ORDER BY pr.rating DESC, pr.created_at DESC LIMIT 3"),
    getContentBlocks('hero_eyebrow'),
    getContentBlocks('value_prop'),
  ]);

  const featuredProducts = products.slice(0, 6);

  return {
    heroSlides: featuredProducts.slice(0, 3).map((product, index) => ({
      id: product.slug,
      eyebrow: heroEyebrows[index]?.title || product.category_name || 'Featured release',
      title: product.name,
      copy: product.short_description,
      imageUrl: product.image_url,
      ctaLabel: 'Explore product',
      route: `#/product/${product.slug}`,
    })),
    featuredProducts,
    featuredCategories: categories.rows,
    orderPipeline: orderPipeline.rows,
    warehouses: warehouses.rows.map((warehouse) => ({
      ...warehouse,
      utilizationRate: warehouse.capacity_units ? Math.round((warehouse.utilized_units / warehouse.capacity_units) * 100) : 0,
    })),
    valueProps: valueProps.map((block) => ({ title: block.title, copy: block.body, eyebrow: block.eyebrow })),
    testimonials: testimonials.rows,
  };
};

const buildBootstrap = async (currentUser, geo = null) => {
  const [home, lookups, demo, products, operationalSettings] = await Promise.all([
    getHomeData(),
    getLookups(),
    getDemoUsers(),
    listProducts(),
    getOperationalSettings(),
  ]);

  // Resolve preferred currency: geo-detected → base currency fallback
  const geoCurrencyCode = geo?.currencyCode || null;
  const baseCurrencyCode = lookups.currencies.find((c) => c.is_base)?.code || 'USD';
  const supportedCodes = new Set(lookups.currencies.map((c) => c.code));
  const preferredCurrencyCode = (geoCurrencyCode && supportedCodes.has(geoCurrencyCode))
    ? geoCurrencyCode
    : baseCurrencyCode;

  const payload = {
    site: {
      brand: 'RealCommerce',
      tagline: 'Production ecommerce infrastructure for discovery, checkout, fulfilment, and operations.',
      location: 'Douala',
      spotlightLabel: 'Inventory-aware checkout, coordinated fulfillment, and live shipping updates in one flow.',
      navigationLinks: [
        { label: 'Home', page: 'home' },
        { label: 'Catalog', page: 'catalog' },
        { label: 'Track order', page: 'access' },
      ],
      footerCta: {
        eyebrow: 'Built for modern commerce',
        title: 'Browse, buy, and ship with confidence from the same operating surface.',
        copy:
          'RealCommerce is designed to feel polished for customers while still exposing the operational controls your team needs behind the scenes.',
      },
      footerColumns: [
        {
          title: 'Explore',
          links: [
            { label: 'Catalog', page: 'catalog' },
            { label: 'Workspace Systems', page: 'catalog', slug: 'workspace-systems' },
            { label: 'Connected Living', page: 'catalog', slug: 'connected-living' },
            { label: 'Urban Mobility', page: 'catalog', slug: 'urban-mobility' },
          ],
        },
        {
          title: 'Operations',
          links: [
            { label: 'Order tracking', page: 'access' },
            { label: 'Fulfillment dashboard', page: 'dashboard' },
            { label: 'Staff workspace', page: 'dashboard' },
            { label: 'Checkout flow', page: 'checkout' },
          ],
        },
        {
          title: 'Support',
          links: [
            { label: 'Account access', page: 'login' },
            { label: 'Register', page: 'register' },
            { label: 'Your cart', page: 'cart' },
            { label: 'Shipping and returns', page: 'access' },
          ],
        },
        {
          title: 'Platform',
          links: [
            { label: 'Home', page: 'home' },
            { label: 'Featured products', page: 'catalog' },
            { label: 'Customer dashboard', page: 'dashboard' },
            { label: 'Operations overview', page: 'dashboard' },
          ],
        },
      ],
      demo,
      seo: {
        organization: 'RealCommerce',
        returnWindowDays: Number(operationalSettings.settings.find((setting) => setting.key === 'default_return_window_days')?.value || 30),
      },
    },
    lookups,
    home,
    products,
    session: currentUser
      ? {
          userId: currentUser.user_id,
          customerId: currentUser.customer_id || null,
          fullName: currentUser.full_name,
          firstName: currentUser.first_name || currentUser.full_name?.split(' ')[0] || '',
          lastName: currentUser.last_name || '',
          email: currentUser.email,
          roleName: currentUser.role_name,
          tierName: currentUser.tier_name || '',
          discountRate: Number(currentUser.discount_rate || 0),
          capabilities: resolveSessionCapabilities(currentUser),
        }
      : null,
    geo: {
      countryCode: geo?.countryCode || 'CM',
      currencyCode: preferredCurrencyCode,
      source: geo?.source || 'default',
    },
    preferredCurrencyCode,
  };

  if (!currentUser) {
    return payload;
  }

  if (currentUser.customer_id) {
    const [customerDashboard, cart, checkout] = await Promise.all([
      getCustomerProfile(currentUser.customer_id),
      getCart(currentUser.customer_id),
      calculateQuote(currentUser.customer_id, {}),
    ]);
    payload.customerDashboard = customerDashboard;
    payload.cart = cart;
    payload.checkout = checkout;
  }

  if (['admin', 'catalog_manager', 'marketing_manager', 'finance_manager'].includes(currentUser.role_name)) {
    payload.adminDashboard = await getAdminDashboard();
  }

  if (['admin', 'order_manager', 'inventory_manager', 'shipping_coordinator'].includes(currentUser.role_name)) {
    payload.operationsDashboard = await getOperationsDashboard();
  }

  return payload;
};

const addCartItem = async ({ customerId, productId, quantity }) => {
  const normalizedQuantity = asNumber(quantity, 0);
  assert(Number.isInteger(normalizedQuantity) && normalizedQuantity > 0, 'Quantity must be greater than zero.');

  await withTransaction(async (client) => {
    const cart = await ensureActiveCart(customerId, client);
    const existingItem = await client.query(
      'SELECT quantity FROM cart_items WHERE cart_id = $1 AND product_id = $2 LIMIT 1',
      [cart.id, productId]
    );
    const totalQuantity = normalizedQuantity + Number(existingItem.rows[0]?.quantity || 0);
    await assertRequestedInventoryAvailable({
      productId,
      quantity: totalQuantity,
      client,
    });
    const pricing = await getProductPricingSnapshot({
      productId,
      quantity: totalQuantity,
      client,
    });

    await client.query(
      `
        INSERT INTO cart_items (cart_id, product_id, quantity, currency_code, original_unit_price, unit_price, discount_amount, discount_label)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        ON CONFLICT (cart_id, product_id)
        DO UPDATE SET
          quantity = cart_items.quantity + EXCLUDED.quantity,
          currency_code = EXCLUDED.currency_code,
          original_unit_price = EXCLUDED.original_unit_price,
          unit_price = EXCLUDED.unit_price,
          discount_amount = EXCLUDED.discount_amount,
          discount_label = EXCLUDED.discount_label
      `,
      [
        cart.id,
        productId,
        normalizedQuantity,
        pricing.currency_code,
        pricing.original_unit_price,
        pricing.unit_price,
        pricing.discount_amount,
        pricing.discount_label,
      ]
    );
  });

  return getCart(customerId);
};

const updateCartItem = async ({ customerId, itemId, quantity }) => {
  const normalizedQuantity = asNumber(quantity, 0);
  assert(Number.isInteger(normalizedQuantity) && normalizedQuantity > 0, 'Quantity must be greater than zero.');

  await withTransaction(async (client) => {
    const cart = await ensureActiveCart(customerId, client);
    const cartItem = await client.query('SELECT product_id FROM cart_items WHERE id = $1 AND cart_id = $2 LIMIT 1', [itemId, cart.id]);
    assert(cartItem.rowCount > 0, 'Cart item not found.', 404);

    await assertRequestedInventoryAvailable({
      productId: cartItem.rows[0].product_id,
      quantity: normalizedQuantity,
      client,
    });
    const pricing = await getProductPricingSnapshot({
      productId: cartItem.rows[0].product_id,
      quantity: normalizedQuantity,
      client,
    });

    await client.query(
      `
        UPDATE cart_items
        SET
          quantity = $1,
          currency_code = $2,
          original_unit_price = $3,
          unit_price = $4,
          discount_amount = $5,
          discount_label = $6
        WHERE id = $7 AND cart_id = $8
      `,
      [
        normalizedQuantity,
        pricing.currency_code,
        pricing.original_unit_price,
        pricing.unit_price,
        pricing.discount_amount,
        pricing.discount_label,
        itemId,
        cart.id,
      ]
    );
  });

  return getCart(customerId);
};

const removeCartItem = async ({ customerId, itemId }) => {
  const cart = await ensureActiveCart(customerId);
  await query('DELETE FROM cart_items WHERE id = $1 AND cart_id = $2', [itemId, cart.id]);
  return getCart(customerId);
};

const createAddress = async ({ customerId, fullName, payload }) => {
  const normalizedAddress = normalizeAddressPayload(payload, fullName);

  assert(isNonEmptyString(normalizedAddress.label), 'Label is required.');
  assert(isNonEmptyString(normalizedAddress.line1), 'Address line 1 is required.');
  assert(isNonEmptyString(normalizedAddress.city), 'City is required.');
  assert(isNonEmptyString(normalizedAddress.country), 'Country is required.');

  const inserted = await query(
    `
      INSERT INTO customer_addresses (customer_id, label, recipient_name, line1, line2, city, state_region, postal_code, country, phone)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING id, label, recipient_name, line1, line2, city, state_region, postal_code, country, phone
    `,
    [
      customerId,
      normalizedAddress.label,
      normalizedAddress.recipientName || fullName,
      normalizedAddress.line1,
      normalizedAddress.line2,
      normalizedAddress.city,
      normalizedAddress.stateRegion,
      normalizedAddress.postalCode,
      normalizedAddress.country,
      normalizedAddress.phone,
    ]
  );

  return inserted.rows[0];
};

const createReview = async ({ customerId, payload }) => {
  const rating = asNumber(payload.rating, 0);
  assert(payload.productId, 'Product is required.');
  assert(Number.isInteger(rating) && rating >= 1 && rating <= 5, 'Rating must be between 1 and 5.');
  assert(isNonEmptyString(payload.title), 'Review title is required.');
  assert(isNonEmptyString(payload.body), 'Review body is required.');

  const review = await query(
    `
      INSERT INTO product_reviews (product_id, customer_id, rating, title, body, is_verified_purchase)
      VALUES ($1, $2, $3, $4, $5, TRUE)
      ON CONFLICT (product_id, customer_id)
      DO UPDATE SET rating = EXCLUDED.rating, title = EXCLUDED.title, body = EXCLUDED.body, created_at = NOW()
      RETURNING id, product_id, rating, title, body
    `,
    [payload.productId, customerId, rating, payload.title.trim(), payload.body.trim()]
  );

  return review.rows[0];
};

const createOrder = async ({ currentUser, payload }) => {
  const normalizedShippingAddress = normalizeAddressPayload(payload.shippingAddress, currentUser.full_name);
  const normalizedBillingAddress = normalizeAddressPayload(
    payload.billingAddress || payload.shippingAddress,
    currentUser.full_name
  );
  const normalizedOrderNote = normalizeNullableText(payload.note);

  assert(normalizedShippingAddress.line1 && normalizedShippingAddress.city && normalizedShippingAddress.country, 'Shipping address is required.');
  assert(isNonEmptyString(payload.paymentMethod), 'Payment method is required.');

  return withTransaction(async (client) => {
    const quote = await calculateQuote(
      currentUser.customer_id,
      {
        shippingMethod: payload.shippingMethod,
        promoCode: payload.promoCode,
        currencyCode: payload.currencyCode,
      },
      { client }
    );
    const converter = createCurrencyConverter({
      client,
      baseCurrencyCode: quote.baseCurrencyCode,
    });
    const paymentMethods = await getPaymentMethods();
    const cart = await ensureActiveCart(currentUser.customer_id, client);
    assert(quote.cart.items.length > 0, 'Cart is empty.');
    const allocation = await lockWarehouseInventoryForOrder({
      items: quote.cart.items,
      client,
    });

    if (payload.saveAddress) {
      await client.query(
        `
          INSERT INTO customer_addresses (customer_id, label, recipient_name, line1, line2, city, state_region, postal_code, country, phone, is_default_shipping, is_default_billing)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, FALSE, FALSE)
        `,
        [
          currentUser.customer_id,
          normalizedShippingAddress.label || 'Saved address',
          normalizedShippingAddress.recipientName || currentUser.full_name,
          normalizedShippingAddress.line1,
          normalizedShippingAddress.line2,
          normalizedShippingAddress.city,
          normalizedShippingAddress.stateRegion,
          normalizedShippingAddress.postalCode,
          normalizedShippingAddress.country,
          normalizedShippingAddress.phone,
        ]
      );
    }

    const selectedPayment = paymentMethods.find((method) => method.id === payload.paymentMethod) || paymentMethods[0];
    assert(selectedPayment, 'No payment methods are configured.', 500);

    const paymentStatus = selectedPayment.id === 'bank_transfer' ? 'AUTHORIZED' : 'CAPTURED';
    const orderStatus = paymentStatus === 'CAPTURED' ? 'PROCESSING' : 'PENDING';

    const orderInsert = await client.query(
      `
        INSERT INTO orders (
          customer_id, order_number, currency_code, base_currency_code, exchange_rate_to_base, order_status, payment_method, shipping_method, subtotal_amount,
          discount_amount,
          shipping_amount, tax_amount, total_amount,
          base_subtotal_amount, base_discount_amount,
          base_shipping_amount, base_tax_amount, base_total_amount,
          promo_code, shipping_address, billing_address, notes, delivery_eta
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20::jsonb, $21::jsonb, $22, $23)
        RETURNING id, order_number, order_status, total_amount, currency_code, delivery_eta
      `,
      [
        currentUser.customer_id,
        createOrderNumber(),
        quote.orderCurrencyCode,
        quote.baseCurrencyCode,
        quote.exchangeRateToBase,
        orderStatus,
        selectedPayment.id,
        quote.shippingMethod.id,
        quote.originalSubtotalAmount,
        quote.tierDiscountAmount + quote.promoDiscountAmount,
        quote.shippingAmount,
        quote.taxAmount,
        quote.totalAmount,
        quote.baseSubtotalAmount,
        quote.baseTierDiscountAmount + quote.basePromoDiscountAmount,
        quote.baseShippingAmount,
        quote.baseTaxAmount,
        quote.baseTotalAmount,
        quote.promotion?.code || null,
        JSON.stringify(normalizedShippingAddress),
        JSON.stringify(normalizedBillingAddress),
        normalizedOrderNote,
        addDays(new Date(), quote.shippingMethod.eta_days).toISOString().slice(0, 10),
      ]
    );

    for (const [index, item] of quote.cart.items.entries()) {
      const [baseOriginalUnitPrice, baseUnitPrice, baseDiscountAmount, baseLineTotal] = await Promise.all([
        converter.convert(item.original_unit_price || item.unit_price, quote.orderCurrencyCode, quote.baseCurrencyCode),
        converter.convert(item.unit_price, quote.orderCurrencyCode, quote.baseCurrencyCode),
        converter.convert(item.discount_amount || 0, quote.orderCurrencyCode, quote.baseCurrencyCode),
        converter.convert(item.line_total, quote.orderCurrencyCode, quote.baseCurrencyCode),
      ]);

      await client.query(
        `
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
          )
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16)
        `,
        [
          orderInsert.rows[0].id,
          index + 1,
          item.product_id,
          item.quantity,
          quote.orderCurrencyCode,
          quote.baseCurrencyCode,
          quote.exchangeRateToBase,
          item.original_unit_price || item.unit_price,
          item.unit_price,
          item.discount_amount || 0,
          baseOriginalUnitPrice,
          baseUnitPrice,
          baseDiscountAmount,
          item.discount_label || null,
          item.line_total,
          baseLineTotal,
        ]
      );
    }

    await client.query('INSERT INTO payments (order_id, provider, payment_method, amount, payment_status, paid_at, transaction_reference) VALUES ($1, $2, $3, $4, $5, $6, $7)', [orderInsert.rows[0].id, selectedPayment.provider, selectedPayment.id, quote.totalAmount, paymentStatus, paymentStatus === 'CAPTURED' ? new Date() : null, `txn_${orderInsert.rows[0].order_number.toLowerCase().replace(/-/g, '_')}`]);
    await client.query('INSERT INTO order_status_events (order_id, status, note, actor_role) VALUES ($1, $2, $3, $4)', [orderInsert.rows[0].id, orderStatus, paymentStatus === 'CAPTURED' ? 'Checkout completed and payment captured.' : 'Checkout completed and awaiting payment settlement.', 'customer']);

    const shipmentStatus = paymentStatus === 'CAPTURED' ? 'PICKING' : 'PENDING';
    const trackingNumber = `trk_${orderInsert.rows[0].order_number.toLowerCase().replace(/-/g, '_')}`;
    const shipmentEventTime = new Date();
    const trackingUrl = buildTrackingUrl(quote.shippingMethod.id === 'freight' ? 'DHL Freight' : 'DHL', trackingNumber);
    const shipmentInsert = await client.query(
      `
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
          estimated_delivery_at
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, tracking_number, tracking_url, estimated_delivery_at
      `,
      [
        orderInsert.rows[0].id,
        allocation.warehouseId,
        quote.shippingMethod.id === 'freight' ? 'DHL Freight' : 'DHL',
        quote.shippingMethod.label,
        shipmentStatus,
        trackingNumber,
        trackingUrl,
        normalizedShippingAddress.city || allocation.warehouseName,
        shipmentEventTime,
        toDeliveryEtaTimestamp(orderInsert.rows[0].delivery_eta),
      ]
    );
    await client.query(
      `
        INSERT INTO shipment_events (shipment_id, status, event_code, location, note, is_public, metadata)
        VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
      `,
      [
        shipmentInsert.rows[0].id,
        shipmentStatus,
        'SHIPMENT_CREATED',
        normalizedShippingAddress.city || allocation.warehouseName,
        'Shipment created from checkout flow.',
        true,
        JSON.stringify({
          source: 'checkout',
          paymentStatus,
          warehouseId: allocation.warehouseId,
        }),
      ]
    );

    for (const item of quote.cart.items) {
      const inventoryUpdate = await client.query(
        `
          UPDATE inventory
          SET quantity_on_hand = quantity_on_hand - $1, updated_at = NOW()
          WHERE product_id = $2
            AND warehouse_id = $3
            AND quantity_on_hand >= $1
          RETURNING id
        `,
        [item.quantity, item.product_id, allocation.warehouseId]
      );

      assert(inventoryUpdate.rowCount > 0, `Inventory changed while reserving ${item.name}. Please try checkout again.`, 409);
    }

    await client.query('UPDATE carts SET status = $1, updated_at = NOW() WHERE id = $2', ['CONVERTED', cart.id]);
    await client.query("INSERT INTO carts (customer_id, currency_code, status) VALUES ($1, $2, 'ACTIVE')", [currentUser.customer_id, quote.orderCurrencyCode]);
    await refreshAnalyticsSnapshots(client);

    const orderResult = {
      ...mapMoneyRow(orderInsert.rows[0], ['total_amount']),
      trackingNumber: shipmentInsert.rows[0].tracking_number,
      trackingUrl: shipmentInsert.rows[0].tracking_url,
    };

    // Fire-and-forget order confirmation email
    const customerEmailResult = await client.query(
      'SELECT u.email, u.full_name FROM users u JOIN customers c ON c.user_id = u.id WHERE c.id = $1 LIMIT 1',
      [currentUser.customer_id]
    );
    if (customerEmailResult.rowCount > 0) {
      const { email, full_name: fullName } = customerEmailResult.rows[0];
      sendOrderConfirmationEmail({
        to: email,
        fullName,
        order: { ...orderResult, shipping_amount: quote.shippingAmount, tax_amount: quote.taxAmount, currency_code: quote.orderCurrencyCode },
        items: quote.cart.items,
      }).catch(() => {});
    }

    return orderResult;
  }, { isolationLevel: 'SERIALIZABLE' });
};

const syncOrderStatusFromShipment = async ({ client, orderId, currentOrderStatus, nextOrderStatus, actorRole, note }) => {
  if (!nextOrderStatus || nextOrderStatus === currentOrderStatus || currentOrderStatus === 'CANCELLED') {
    return currentOrderStatus;
  }

  await client.query('UPDATE orders SET order_status = $1 WHERE id = $2', [nextOrderStatus, orderId]);
  await client.query(
    'INSERT INTO order_status_events (order_id, status, note, actor_role) VALUES ($1, $2, $3, $4)',
    [orderId, nextOrderStatus, note || 'Order status synchronized from shipment activity.', actorRole]
  );
  await refreshAnalyticsSnapshots(client);

  return nextOrderStatus;
};

const getShipmentRecordForUpdate = async ({ shipmentId, client }) => {
  const shipment = await client.query(
    `
      SELECT
        s.id,
        s.order_id,
        s.warehouse_id,
        s.carrier,
        s.service_level,
        s.shipment_status,
        s.tracking_number,
        s.tracking_url,
        s.last_known_location,
        s.last_event_at,
        s.estimated_delivery_at,
        s.shipped_at,
        s.delivered_at,
        o.order_number,
        o.order_status,
        o.customer_id,
        o.delivery_eta
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      WHERE s.id = $1
      LIMIT 1
      FOR UPDATE
    `,
    [shipmentId]
  );

  assert(shipment.rowCount > 0, 'Shipment not found.', 404);
  return shipment.rows[0];
};

const applyShipmentTrackingUpdate = async ({
  client,
  shipmentId,
  status = null,
  location = null,
  note = null,
  eventCode = 'STATUS_UPDATE',
  isPublic = true,
  metadata = {},
  actorRole = 'operations_manager',
  enforceTransition = false,
}) => {
  const shipment = await getShipmentRecordForUpdate({ shipmentId, client });
  const nextStatus = normalizeText(status).toUpperCase() || shipment.shipment_status;
  assert(SHIPMENT_STATUS_TRANSITIONS[nextStatus], `Unsupported shipment status ${nextStatus}.`, 400);

  if (enforceTransition) {
    assertValidShipmentTransition(shipment.shipment_status, nextStatus);
  }

  const eventTime = new Date();
  const resolvedLocation = normalizeNullableText(location) || shipment.last_known_location || null;
  const resolvedNote =
    normalizeNullableText(note)
    || (enforceTransition ? 'Shipment updated from operations dashboard.' : 'Manual shipment event recorded.');
  const resolvedEventCode = normalizeText(eventCode).toUpperCase() || 'STATUS_UPDATE';
  const resolvedMetadata =
    metadata && typeof metadata === 'object' && !Array.isArray(metadata) ? metadata : {};
  const trackingUrl = shipment.tracking_url || buildTrackingUrl(shipment.carrier, shipment.tracking_number);
  const estimatedDeliveryAt = shipment.estimated_delivery_at || toDeliveryEtaTimestamp(shipment.delivery_eta);

  const updatedShipment = await client.query(
    `
      UPDATE shipments
      SET
        shipment_status = $1,
        tracking_url = COALESCE($2, tracking_url),
        last_known_location = COALESCE($3, last_known_location),
        last_event_at = $4,
        estimated_delivery_at = COALESCE(estimated_delivery_at, $5),
        shipped_at = CASE WHEN $1 IN ('PACKED', 'IN_TRANSIT') AND shipped_at IS NULL THEN $4 ELSE shipped_at END,
        delivered_at = CASE WHEN $1 = 'DELIVERED' AND delivered_at IS NULL THEN $4 ELSE delivered_at END
      WHERE id = $6
      RETURNING
        id,
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
    `,
    [nextStatus, trackingUrl, resolvedLocation, eventTime, estimatedDeliveryAt, shipmentId]
  );

  await client.query(
    `
      INSERT INTO shipment_events (shipment_id, status, event_code, location, note, is_public, metadata, event_time)
      VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb, $8)
    `,
    [
      shipmentId,
      nextStatus,
      resolvedEventCode,
      resolvedLocation,
      resolvedNote,
      Boolean(isPublic),
      JSON.stringify(resolvedMetadata),
      eventTime,
    ]
  );

  const nextOrderStatus = await syncOrderStatusFromShipment({
    client,
    orderId: shipment.order_id,
    currentOrderStatus: shipment.order_status,
    nextOrderStatus: deriveOrderStatusFromShipmentStatus(nextStatus),
    actorRole,
    note: `Order status synchronized after shipment moved to ${nextStatus}.`,
  });

  return {
    ...updatedShipment.rows[0],
    order_number: shipment.order_number,
    order_status: nextOrderStatus,
    customer_id: shipment.customer_id,
    delivery_eta: shipment.delivery_eta,
  };
};

const assertActorCanAccessOrder = async ({ actor, orderId, customerId }) => {
  if (!actor) {
    return { staffScoped: false };
  }

  if (actor.role_name === 'customer') {
    assert(actor.customer_id === customerId, 'You cannot access another customer order.', 403);
    return { staffScoped: false };
  }

  return { staffScoped: true };
};

const getShipmentDetailById = async ({ shipmentId, actor = null, client = { query } }) => {
  const shipment = await client.query(
    `
      SELECT
        s.id,
        s.order_id,
        o.order_number,
        o.order_status,
        o.customer_id,
        o.placed_at,
        o.delivery_eta,
        s.warehouse_id,
        w.name AS warehouse_name,
        s.carrier,
        s.service_level,
        s.shipment_status,
        s.tracking_number,
        s.tracking_url,
        s.last_known_location,
        s.last_event_at,
        s.estimated_delivery_at,
        s.shipped_at,
        s.delivered_at
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      LEFT JOIN warehouses w ON w.id = s.warehouse_id
      WHERE s.id = $1
      LIMIT 1
    `,
    [shipmentId]
  );

  if (shipment.rowCount === 0) {
    return null;
  }

  const access = await assertActorCanAccessOrder({
    actor,
    orderId: shipment.rows[0].order_id,
    customerId: shipment.rows[0].customer_id,
  });
  const visibilityClause = access.staffScoped ? '' : 'AND is_public = TRUE';
  const shipmentEvents = await client.query(
    `
      SELECT status, event_code, location, note, is_public, metadata, event_time
      FROM shipment_events
      WHERE shipment_id = $1 ${visibilityClause}
      ORDER BY event_time DESC, id DESC
    `,
    [shipmentId]
  );

  return {
    ...shipment.rows[0],
    shipmentEvents: shipmentEvents.rows,
    trackingSummary: buildShipmentTrackingSummary({
      shipment: shipment.rows[0],
      shipmentEvents: shipmentEvents.rows,
      deliveryEta: shipment.rows[0].delivery_eta,
    }),
  };
};

const getShipmentTracking = async (trackingNumber, actor = null) => {
  assert(isNonEmptyString(trackingNumber), 'Tracking number is required.');

  const shipment = await query(
    'SELECT id FROM shipments WHERE LOWER(tracking_number) = LOWER($1) LIMIT 1',
    [trackingNumber.trim()]
  );

  if (shipment.rowCount === 0) {
    return null;
  }

  return getShipmentDetailById({
    shipmentId: shipment.rows[0].id,
    actor,
  });
};

const listShipments = async (requestQuery = {}) => {
  const statusFilter = normalizeText(requestQuery.status).toUpperCase();
  const search = normalizeText(requestQuery.q);
  const limit = normalizeLimit(requestQuery.limit, 20) || 20;
  const offset = normalizeOffset(requestQuery.offset, 0);
  const where = [];
  const params = [];

  if (statusFilter && statusFilter !== 'ALL') {
    assert(SHIPMENT_STATUS_TRANSITIONS[statusFilter], `Unsupported shipment status filter ${statusFilter}.`, 400);
    params.push(statusFilter);
    where.push(`s.shipment_status = $${params.length}`);
  }

  if (search) {
    params.push(`%${search}%`);
    where.push(`(
      s.tracking_number ILIKE $${params.length}
      OR o.order_number ILIKE $${params.length}
      OR s.carrier ILIKE $${params.length}
      OR COALESCE(s.last_known_location, '') ILIKE $${params.length}
    )`);
  }

  if (requestQuery.delayed === 'true') {
    where.push("s.shipment_status <> 'DELIVERED' AND s.estimated_delivery_at IS NOT NULL AND s.estimated_delivery_at < NOW()");
  }

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const overview = await query(
    `
      SELECT
        COUNT(*)::integer AS shipment_count,
        COUNT(*) FILTER (WHERE s.shipment_status IN ('PENDING', 'PICKING', 'PACKED', 'IN_TRANSIT'))::integer AS active_shipments,
        COUNT(*) FILTER (WHERE s.shipment_status = 'DELIVERED')::integer AS delivered_shipments,
        COUNT(*) FILTER (WHERE s.shipment_status = 'RETURNED')::integer AS returned_shipments,
        COUNT(*) FILTER (
          WHERE s.shipment_status <> 'DELIVERED'
            AND s.estimated_delivery_at IS NOT NULL
            AND s.estimated_delivery_at < NOW()
        )::integer AS delayed_shipments,
        ROUND(
          CASE
            WHEN COUNT(*) FILTER (WHERE s.shipment_status = 'DELIVERED') = 0 THEN 100
            ELSE 100.0 * COUNT(*) FILTER (
              WHERE s.shipment_status = 'DELIVERED'
                AND (s.estimated_delivery_at IS NULL OR s.delivered_at <= s.estimated_delivery_at)
            ) / NULLIF(COUNT(*) FILTER (WHERE s.shipment_status = 'DELIVERED'), 0)
          END,
          1
        ) AS on_time_delivery_rate
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      ${whereClause}
    `,
    params
  );

  const items = await query(
    `
      SELECT
        s.id,
        s.order_id,
        o.order_number,
        o.order_status,
        o.placed_at,
        o.delivery_eta,
        s.carrier,
        s.service_level,
        s.shipment_status,
        s.tracking_number,
        s.tracking_url,
        s.last_known_location,
        s.last_event_at,
        s.estimated_delivery_at,
        s.shipped_at,
        s.delivered_at,
        w.name AS warehouse_name,
        latest_event.event_code AS latest_event_code,
        latest_event.location AS latest_location,
        latest_event.note AS latest_note,
        latest_event.event_time AS latest_event_time
      FROM shipments s
      JOIN orders o ON o.id = s.order_id
      LEFT JOIN warehouses w ON w.id = s.warehouse_id
      LEFT JOIN LATERAL (
        SELECT event_code, location, note, event_time
        FROM shipment_events se
        WHERE se.shipment_id = s.id
        ORDER BY se.event_time DESC, se.id DESC
        LIMIT 1
      ) latest_event ON TRUE
      ${whereClause}
      ORDER BY COALESCE(s.last_event_at, s.shipped_at, o.placed_at) DESC, s.id DESC
      LIMIT $${params.length + 1}
      OFFSET $${params.length + 2}
    `,
    [...params, limit, offset]
  );

  return {
    overview: {
      ...overview.rows[0],
      on_time_delivery_rate: Number(overview.rows[0]?.on_time_delivery_rate || 0),
    },
    items: items.rows.map((shipment) => ({
      ...shipment,
      trackingSummary: buildShipmentTrackingSummary({
        shipment,
        shipmentEvents: shipment.latest_event_time
          ? [{ event_time: shipment.latest_event_time, location: shipment.latest_location }]
          : [],
        deliveryEta: shipment.delivery_eta,
      }),
    })),
    pagination: {
      limit,
      offset,
      count: items.rows.length,
    },
  };
};

const getOrderDetail = async (orderNumber, actor = null) => {
  const order = await query(
    `
      SELECT
        id,
        customer_id,
        order_number,
        order_status,
        payment_method,
        shipping_method,
        exchange_rate_to_base,
        subtotal_amount,
        discount_amount,
        shipping_amount,
        tax_amount,
        total_amount,
        currency_code,
        base_currency_code,
        base_subtotal_amount,
        base_discount_amount,
        base_shipping_amount,
        base_tax_amount,
        base_total_amount,
        placed_at,
        delivery_eta,
        shipping_address
      FROM orders
      WHERE order_number = $1
      LIMIT 1
    `,
    [orderNumber]
  );
  if (order.rowCount === 0) {
    return null;
  }

  const access = await assertActorCanAccessOrder({
    actor,
    orderId: order.rows[0].id,
    customerId: order.rows[0].customer_id,
  });

  const itemQuery = {
    text: 'SELECT oi.line_number, oi.quantity, oi.currency_code, oi.base_currency_code, oi.original_unit_price, oi.unit_price, oi.discount_amount, oi.base_original_unit_price, oi.base_unit_price, oi.base_discount_amount, oi.discount_label, oi.line_total, oi.base_line_total, p.name, p.slug FROM order_items oi JOIN products p ON p.id = oi.product_id WHERE oi.order_id = $1 ORDER BY oi.line_number ASC',
    values: [order.rows[0].id],
  };

  const [items, orderStatusEvents, shipmentLookup] = await Promise.all([
    query(itemQuery.text, itemQuery.values),
    query('SELECT status, note, actor_role, created_at FROM order_status_events WHERE order_id = $1 ORDER BY created_at DESC', [order.rows[0].id]),
    query('SELECT id FROM shipments WHERE order_id = $1 LIMIT 1', [order.rows[0].id]),
  ]);

  const shipmentDetail = shipmentLookup.rows[0]
    ? await getShipmentDetailById({
        shipmentId: shipmentLookup.rows[0].id,
        actor: access.staffScoped ? actor : { role_name: 'customer', customer_id: order.rows[0].customer_id },
      })
    : null;

  const {
    customer_id: _customerId,
    total_amount: totalAmount,
    ...orderFields
  } = order.rows[0];
  const normalizedOrderFields = mapMoneyRow(orderFields, [
    'subtotal_amount',
    'discount_amount',
    'shipping_amount',
    'tax_amount',
    'base_subtotal_amount',
    'base_discount_amount',
    'base_shipping_amount',
    'base_tax_amount',
    'base_total_amount',
  ]);

  return {
    ...normalizedOrderFields,
    exchange_rate_to_base: roundRate(orderFields.exchange_rate_to_base),
    total_amount: roundMoney(totalAmount),
    items: items.rows.map((row) =>
      mapMoneyRow(row, [
        'original_unit_price',
        'unit_price',
        'discount_amount',
        'base_original_unit_price',
        'base_unit_price',
        'base_discount_amount',
        'line_total',
        'base_line_total',
      ])
    ),
    shipment: shipmentDetail
      ? {
          id: shipmentDetail.id,
          warehouse_id: shipmentDetail.warehouse_id,
          warehouse_name: shipmentDetail.warehouse_name,
          carrier: shipmentDetail.carrier,
          service_level: shipmentDetail.service_level,
          shipment_status: shipmentDetail.shipment_status,
          tracking_number: shipmentDetail.tracking_number,
          tracking_url: shipmentDetail.tracking_url,
          last_known_location: shipmentDetail.last_known_location,
          last_event_at: shipmentDetail.last_event_at,
          estimated_delivery_at: shipmentDetail.estimated_delivery_at,
          shipped_at: shipmentDetail.shipped_at,
          delivered_at: shipmentDetail.delivered_at,
        }
      : null,
    shipmentEvents: shipmentDetail?.shipmentEvents || [],
    latestShipmentEvent: shipmentDetail?.shipmentEvents?.[0] || null,
    trackingSummary: shipmentDetail?.trackingSummary || null,
    orderStatusEvents: orderStatusEvents.rows,
  };
};

const assertProductExists = async ({ productId }) => {
  const result = await query('SELECT id FROM products WHERE id = $1 LIMIT 1', [productId]);
  assert(result.rowCount > 0, 'Product not found.', 404);
  return result.rows[0];
};

const createProduct = async ({ actor, payload }) => {
  assert(payload.categoryId, 'Category is required.');
  assert(isNonEmptyString(payload.sku), 'SKU is required.');
  assert(isNonEmptyString(payload.name), 'Product name is required.');
  assert(isNonEmptyString(payload.slug), 'Slug is required.');
  assert(isNonEmptyString(payload.shortDescription), 'Short description is required.');
  assert(isNonEmptyString(payload.longDescription), 'Long description is required.');
  assert(asNumber(payload.unitPrice, NaN) >= 0, 'Unit price is required.');

  return withTransaction(async (client) => {
    const normalizedSlug = normalizeSlug(payload.slug);
    const normalizedPrimaryImageUrl = normalizeUrl(payload.primaryImageUrl);
    assert(isNonEmptyString(normalizedSlug), 'Slug must contain only URL-safe characters.');
    assert(
      !payload.primaryImageUrl || Boolean(normalizedPrimaryImageUrl),
      'primaryImageUrl must be a valid http or https URL.'
    );

    const insert = await client.query(
      `
        INSERT INTO products (category_id, sku, name, slug, short_description, long_description, unit_price, currency_code, is_featured, launch_month)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING id, slug
      `,
      [
        payload.categoryId,
        payload.sku.trim(),
        payload.name.trim(),
        normalizedSlug,
        payload.shortDescription.trim(),
        payload.longDescription.trim(),
        Number(payload.unitPrice),
        payload.currencyCode || 'USD',
        Boolean(payload.isFeatured),
        payload.launchMonth || null,
      ]
    );

    if (normalizedPrimaryImageUrl) {
      await client.query(
        "INSERT INTO product_images (product_id, storage_provider, source_url, public_url, alt_text, is_primary, asset_status) VALUES ($1, 'external', $2, $2, $3, TRUE, 'READY')",
        [insert.rows[0].id, normalizedPrimaryImageUrl, payload.altText || payload.name]
      );
    }

    for (const attribute of payload.attributes || []) {
      if (!attribute.name || !attribute.valueText) {
        continue;
      }

      const attributeId = await client.query('SELECT id FROM product_attributes WHERE name = $1 LIMIT 1', [attribute.name]);
      if (attributeId.rowCount > 0) {
        await client.query('INSERT INTO product_attribute_values (product_id, attribute_id, value_text) VALUES ($1, $2, $3) ON CONFLICT (product_id, attribute_id) DO UPDATE SET value_text = EXCLUDED.value_text', [insert.rows[0].id, attributeId.rows[0].id, attribute.valueText]);
      }
    }

    for (const stock of payload.inventoryByWarehouse || []) {
      if (!stock.warehouseId) {
        continue;
      }
      await client.query('INSERT INTO inventory (product_id, warehouse_id, quantity_on_hand, reorder_point, safety_stock) VALUES ($1, $2, $3, $4, $5)', [insert.rows[0].id, stock.warehouseId, Number(stock.quantityOnHand || 0), Number(stock.reorderPoint || 0), Number(stock.safetyStock || 0)]);
    }

    await recordAdminActivity({
      client,
      actorUserId: actor?.user_id,
      actorRole: actor?.role_name,
      action: 'product.created',
      entityType: 'product',
      entityId: insert.rows[0].id,
      summary: `Created product ${payload.name.trim()}.`,
      metadata: {
        sku: payload.sku.trim(),
        slug: normalizedSlug,
        categoryId: payload.categoryId,
      },
    });

    return insert.rows[0];
  });
};

const createDiscountPromotion = async ({ actor, payload }) => {
  assert(isNonEmptyString(payload.name), 'Discount name is required.');
  assert(isNonEmptyString(payload.discountType), 'discountType is required.');
  assert(['PERCENT', 'FIXED', 'SHIPPING'].includes(String(payload.discountType).toUpperCase()), 'discountType must be PERCENT, FIXED, or SHIPPING.');
  assert(asNumber(payload.discountValue, NaN) > 0, 'discountValue must be greater than zero.');
  assert(isNonEmptyString(payload.code), 'Promo code is required.');

  const discountType = String(payload.discountType).toUpperCase();
  const startsAt = payload.startsAt || new Date().toISOString();
  const endsAt = payload.endsAt || addDays(new Date(), 30).toISOString();
  assert(new Date(endsAt).getTime() > new Date(startsAt).getTime(), 'endsAt must be later than startsAt.');

  const result = await query(
    `
      INSERT INTO promotions (code, title, description, discount_type, discount_value, minimum_order_amount, is_active, starts_at, ends_at)
      VALUES ($1, $2, $3, $4, $5, $6, TRUE, $7, $8)
      RETURNING id, code, title, description, discount_type, discount_value, minimum_order_amount, is_active, starts_at, ends_at
    `,
    [
      payload.code.trim().toUpperCase(),
      payload.name.trim(),
      payload.description || null,
      discountType,
      Number(payload.discountValue),
      Math.max(0, asNumber(payload.minimumOrderAmount, 0)),
      startsAt,
      endsAt,
    ]
  );

  await recordAdminActivity({
    actorUserId: actor?.user_id,
    actorRole: actor?.role_name,
    action: 'discount.created',
    entityType: 'promotion',
    entityId: result.rows[0].id,
    summary: `Created promotion ${payload.name.trim()} (${payload.code.trim().toUpperCase()}).`,
    metadata: {
      discountType,
      discountValue: Number(payload.discountValue),
    },
  });

  return mapMoneyRow(result.rows[0], ['discount_value', 'minimum_order_amount']);
};

const updatePlatformSettings = async ({ actor = null, payload }) => {
  const editableSettings = {
    tax_rate: 'Default marketplace tax rate used by the quote engine.',
    free_shipping_threshold: 'Order value at which standard shipping becomes free.',
    support_email: 'Primary support contact shown in admin workflows.',
    default_return_window_days: 'Default return window for storefront messaging.',
    review_auto_publish: 'Whether verified reviews are published immediately.',
  };

  const entries = Object.entries(payload || {}).filter(([key, value]) => key in editableSettings && value !== undefined);
  assert(entries.length > 0, 'At least one platform setting is required.');

  for (const [key, value] of entries) {
    if (key === 'tax_rate') {
      assert(Number.isFinite(Number(value)) && Number(value) >= 0 && Number(value) <= 1, 'tax_rate must be between 0 and 1.');
    }

    if (key === 'free_shipping_threshold') {
      assert(Number.isFinite(Number(value)) && Number(value) >= 0, 'free_shipping_threshold must be zero or greater.');
    }

    if (key === 'support_email') {
      assert(isEmail(value), 'support_email must be a valid email address.');
    }

    if (key === 'default_return_window_days') {
      assert(Number.isInteger(Number(value)) && Number(value) >= 0, 'default_return_window_days must be a whole number zero or greater.');
    }

    await query(
      `
        INSERT INTO platform_settings (key, value_json, description, updated_at)
        VALUES ($1, $2::jsonb, $3, NOW())
        ON CONFLICT (key)
        DO UPDATE SET value_json = EXCLUDED.value_json, description = EXCLUDED.description, updated_at = NOW()
      `,
      [key, JSON.stringify(value), editableSettings[key]]
    );
  }

  await recordAdminActivity({
    actorUserId: actor?.user_id,
    actorRole: actor?.role_name,
    action: 'platform.settings.updated',
    entityType: 'platform_settings',
    entityId: 'global',
    summary: `Updated ${entries.length} platform setting${entries.length === 1 ? '' : 's'}.`,
    metadata: {
      keys: entries.map(([key]) => key),
    },
  });

  return getPlatformSettings();
};

const attachProductImage = async ({ actor, productId, publicUrl, sourceUrl, altText, isPrimary }) => {
  const normalizedPublicUrl = normalizeUrl(publicUrl);
  const normalizedSourceUrl = normalizeUrl(sourceUrl) || normalizedPublicUrl;
  const normalizedAltText = normalizeNullableText(altText) || 'Product image';
  const resolvedIsPrimary = normalizeBoolean(isPrimary, false);

  assert(normalizedPublicUrl || normalizedSourceUrl, 'Image URL is required.');
  await assertProductExists({ productId });

  return withTransaction(async (client) => {
    if (resolvedIsPrimary) {
      await client.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [productId]);
    }

    const inserted = await client.query(
      "INSERT INTO product_images (product_id, storage_provider, public_url, source_url, alt_text, is_primary, asset_status) VALUES ($1, $2, $3, $4, $5, $6, 'READY') RETURNING id, public_url, source_url, alt_text, is_primary",
      [
        productId,
        normalizedPublicUrl ? 'gcs' : 'external',
        normalizedPublicUrl || null,
        normalizedSourceUrl || null,
        normalizedAltText,
        resolvedIsPrimary,
      ]
    );

    return inserted.rows[0];
  });
};

const updateOrderStatus = async ({ orderId, status, actorRole, actorUserId = null, note }) => {
  const normalizedStatus = normalizeText(status).toUpperCase();
  assert(isNonEmptyString(normalizedStatus), 'Status is required.');
  assertValidOrderStatus(normalizedStatus);

  await withTransaction(async (client) => {
    const updatedOrder = await client.query('UPDATE orders SET order_status = $1 WHERE id = $2 RETURNING id', [normalizedStatus, orderId]);
    assert(updatedOrder.rowCount > 0, 'Order not found.', 404);
    await client.query('INSERT INTO order_status_events (order_id, status, note, actor_role) VALUES ($1, $2, $3, $4)', [orderId, normalizedStatus, note || 'Status updated from dashboard.', actorRole]);
    await recordAdminActivity({
      client,
      actorUserId,
      actorRole,
      action: 'order.status.updated',
      entityType: 'order',
      entityId: orderId,
      summary: `Updated order ${orderId} to ${normalizedStatus}.`,
      metadata: {
        note: note || null,
      },
    });
    await refreshAnalyticsSnapshots(client);
  });
};

const createShipmentEvent = async ({ shipmentId, payload = {}, actorRole, actorUserId = null }) => {
  return withTransaction(async (client) => {
    await applyShipmentTrackingUpdate({
      client,
      shipmentId,
      status: payload.status || null,
      location: payload.location || null,
      note: payload.note || null,
      eventCode: payload.eventCode || 'MANUAL_UPDATE',
      isPublic: normalizeBoolean(payload.isPublic, true),
      metadata: payload.metadata || {},
      actorRole,
      enforceTransition: Boolean(payload.status),
    });

    await recordAdminActivity({
      client,
      actorUserId,
      actorRole,
      action: 'shipment.event.created',
      entityType: 'shipment',
      entityId: shipmentId,
      summary: `Recorded shipment event for shipment ${shipmentId}.`,
      metadata: {
        status: payload.status || null,
        eventCode: payload.eventCode || 'MANUAL_UPDATE',
        isPublic: normalizeBoolean(payload.isPublic, true),
      },
    });

    return getShipmentDetailById({
      shipmentId,
      actor: { role_name: actorRole || 'operations_manager' },
      client,
    });
  });
};

const updateShipmentStatus = async ({ shipmentId, status, location, note, actorRole, actorUserId = null }) => {
  const normalizedStatus = normalizeText(status).toUpperCase();
  assert(isNonEmptyString(normalizedStatus), 'Status is required.');

  await withTransaction(async (client) => {
    await applyShipmentTrackingUpdate({
      client,
      shipmentId,
      status: normalizedStatus,
      location: location || 'Operations desk',
      note,
      eventCode: 'STATUS_UPDATE',
      isPublic: true,
      metadata: { source: 'operations_dashboard' },
      actorRole: actorRole || 'operations_manager',
      enforceTransition: true,
    });

    await recordAdminActivity({
      client,
      actorUserId,
      actorRole: actorRole || 'operations_manager',
      action: 'shipment.status.updated',
      entityType: 'shipment',
      entityId: shipmentId,
      summary: `Updated shipment ${shipmentId} to ${normalizedStatus}.`,
      metadata: {
        location: location || 'Operations desk',
        note: note || null,
      },
    });

    // Send transactional emails for key shipment milestones
    if (['IN_TRANSIT', 'DELIVERED'].includes(normalizedStatus)) {
      const shipmentData = await client.query(
        `SELECT s.tracking_number, s.tracking_url, s.carrier,
                o.order_number, o.delivery_eta, o.currency_code,
                u.email, u.full_name
         FROM shipments s
         JOIN orders o ON o.id = s.order_id
         JOIN customers c ON c.id = o.customer_id
         JOIN users u ON u.id = c.user_id
         WHERE s.id = $1 LIMIT 1`,
        [shipmentId]
      );
      if (shipmentData.rowCount > 0) {
        const row = shipmentData.rows[0];
        if (normalizedStatus === 'IN_TRANSIT') {
          sendShipmentDispatchedEmail({
            to: row.email, fullName: row.full_name,
            order: { order_number: row.order_number, delivery_eta: row.delivery_eta },
            shipment: { tracking_number: row.tracking_number, tracking_url: row.tracking_url, carrier: row.carrier },
          }).catch(() => {});
        } else if (normalizedStatus === 'DELIVERED') {
          sendDeliveryConfirmationEmail({
            to: row.email, fullName: row.full_name,
            order: { order_number: row.order_number },
          }).catch(() => {});
        }
      }
    }
  });
};

const signProductImageUpload = async ({ actor, productId, fileName, mimeType }) => {
  assert(productId, 'productId is required.');
  assert(isNonEmptyString(fileName), 'fileName is required.');
  assert(isNonEmptyString(mimeType), 'mimeType is required.');
  assert(ALLOWED_IMAGE_MIME_TYPES.has(mimeType), 'Only AVIF, GIF, JPEG, PNG, and WEBP images are supported.');
  await assertProductExists({ productId });

  const objectPath = `products/${productId}/${crypto.randomUUID()}.${getFileExtension(fileName, mimeType)}`;
  const image = await query(
    "INSERT INTO product_images (product_id, storage_provider, mime_type, object_path, asset_status) VALUES ($1, 'gcs', $2, $3, 'PENDING') RETURNING id, object_path",
    [productId, mimeType, objectPath]
  );
  const signed = await createSignedUpload({ objectPath: image.rows[0].object_path, mimeType });

  return {
    imageId: image.rows[0].id,
    objectPath: image.rows[0].object_path,
    ...signed,
  };
};

const completeProductImageUpload = async ({ actor, imageId, productId, publicUrl, altText, isPrimary }) => {
  assert(productId, 'productId is required.');
  await assertProductExists({ productId });

  return withTransaction(async (client) => {
    const existingImage = await client.query(
      `
        SELECT id, product_id, object_path, public_url, is_primary
        FROM product_images
        WHERE id = $1
        LIMIT 1
      `,
      [imageId]
    );
    assert(existingImage.rowCount > 0, 'Product image not found.', 404);
    assert(Number(existingImage.rows[0].product_id) === Number(productId), 'Product image does not belong to this product.', 403);

    const resolvedPublicUrl =
      normalizeUrl(publicUrl) ||
      existingImage.rows[0].public_url ||
      buildPublicUrl(existingImage.rows[0].object_path);
    const resolvedAltText = normalizeNullableText(altText) || null;
    const resolvedIsPrimary = isPrimary === undefined
      ? existingImage.rows[0].is_primary
      : normalizeBoolean(isPrimary, false);

    if (resolvedIsPrimary) {
      await client.query('UPDATE product_images SET is_primary = FALSE WHERE product_id = $1', [productId]);
    }

    const updated = await client.query(
      `
        UPDATE product_images
        SET
          product_id = COALESCE($2, product_id),
          public_url = COALESCE($3, public_url),
          source_url = COALESCE(source_url, $3),
          alt_text = COALESCE($4, alt_text),
          is_primary = $5,
          asset_status = 'READY',
          updated_at = NOW()
        WHERE id = $1
        RETURNING id, product_id, public_url, object_path, alt_text, is_primary, asset_status
      `,
      [imageId, productId || null, resolvedPublicUrl || null, resolvedAltText, resolvedIsPrimary]
    );

    return updated.rows[0];
  });
};

const cancelOrder = async ({ orderNumber, customerId }) => {
  return withTransaction(async (client) => {
    const order = await client.query(
      `SELECT id, order_status, customer_id FROM orders WHERE order_number = $1 LIMIT 1`,
      [orderNumber]
    );
    assert(order.rowCount > 0, 'Order not found.', 404);
    assert(Number(order.rows[0].customer_id) === Number(customerId), 'You cannot cancel another customer\'s order.', 403);
    assert(
      ['PENDING', 'PROCESSING'].includes(order.rows[0].order_status),
      'Only pending or processing orders can be cancelled.',
      409
    );

    const orderId = order.rows[0].id;
    await client.query('UPDATE orders SET order_status = $1 WHERE id = $2', ['CANCELLED', orderId]);
    await client.query(
      'INSERT INTO order_status_events (order_id, status, note, actor_role) VALUES ($1, $2, $3, $4)',
      [orderId, 'CANCELLED', 'Cancelled by customer.', 'customer']
    );

    // Restore inventory
    const items = await client.query(
      `SELECT oi.product_id, oi.quantity, s.warehouse_id
       FROM order_items oi
       JOIN shipments s ON s.order_id = oi.order_id
       WHERE oi.order_id = $1`,
      [orderId]
    );
    for (const item of items.rows) {
      if (item.warehouse_id) {
        await client.query(
          'UPDATE inventory SET quantity_on_hand = quantity_on_hand + $1 WHERE product_id = $2 AND warehouse_id = $3',
          [item.quantity, item.product_id, item.warehouse_id]
        );
      }
    }

    await refreshAnalyticsSnapshots(client);
    return { success: true, orderNumber };
  });
};

const getSellerProfileBySlug = async (slug) => {
  const result = await query('SELECT id FROM seller_profiles WHERE slug = $1 AND is_active = TRUE LIMIT 1', [slug]);
  if (result.rowCount === 0) return null;
  return getSellerProfile(result.rows[0].id);
};

const getCustomerOrders = async ({ customerId, limit = 20, offset = 0 }) => {
  const safeLimit  = Math.min(100, Math.max(1, Number(limit)  || 20));
  const safeOffset = Math.max(0, Number(offset) || 0);

  const [orders, total] = await Promise.all([
    query(
      `SELECT order_number, order_status, total_amount, currency_code, placed_at, delivery_eta, shipping_method
       FROM orders WHERE customer_id = $1
       ORDER BY placed_at DESC LIMIT $2 OFFSET $3`,
      [customerId, safeLimit, safeOffset]
    ),
    query('SELECT COUNT(*)::integer AS total FROM orders WHERE customer_id = $1', [customerId]),
  ]);

  return {
    orders: orders.rows.map((row) => mapMoneyRow(row, ['total_amount'])),
    pagination: { limit: safeLimit, offset: safeOffset, total: Number(total.rows[0]?.total || 0) },
  };
};

module.exports = {
  addCartItem,
  attachProductImage,
  buildBootstrap,
  calculateQuote,
  cancelOrder,
  completeProductImageUpload,
  createShipmentEvent,
  createAddress,
  createDiscountPromotion,
  createOrder,
  createProduct,
  createReview,
  getAdvancedAnalyticsReport,
  getAdminDashboard,
  getCart,
  getCustomerOrders,
  getCustomerProfile,
  getHomeData,
  getOperationsDashboard,
  getOrderDetail,
  getProductDetail,
  getShipmentTracking,
  listProducts,
  listShipments,
  removeCartItem,
  signProductImageUpload,
  updatePlatformSettings,
  updateCartItem,
  updateOrderStatus,
  updateShipmentStatus,
};
