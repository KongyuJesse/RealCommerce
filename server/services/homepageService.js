const { query } = require('../db');
const { listCategories, listProducts } = require('./catalogService');

function toNumber(value) {
  return Number(value);
}

async function getMetrics() {
  const result = await query(`
    SELECT
      (SELECT COUNT(*)::int FROM products) AS total_products,
      (SELECT COUNT(*)::int FROM categories) AS total_categories,
      (SELECT COUNT(*)::int FROM orders) AS total_orders,
      (SELECT COUNT(*)::int FROM warehouses WHERE is_active = TRUE) AS active_warehouses,
      (SELECT COALESCE(SUM(quantity_on_hand), 0)::int FROM inventory) AS stock_units,
      (SELECT COALESCE(SUM(total_amount), 0) FROM orders) AS tracked_revenue
  `);

  const row = result.rows[0];

  return [
    {
      label: 'Live SKUs',
      value: row.total_products,
      detail: `${row.total_categories} merchandising lanes`,
    },
    {
      label: 'Warehouses',
      value: row.active_warehouses,
      detail: `${row.stock_units} units on hand`,
    },
    {
      label: 'Orders Routed',
      value: row.total_orders,
      detail: 'Seeded across payment and shipment states',
    },
    {
      label: 'Tracked Revenue',
      value: toNumber(row.tracked_revenue),
      detail: 'Gross merchandise value in seeded data',
      kind: 'currency',
      currency: 'USD',
    },
  ];
}

async function getPipeline() {
  const result = await query(`
    SELECT
      order_status,
      COUNT(*)::int AS total
    FROM orders
    GROUP BY order_status
    ORDER BY
      CASE order_status
        WHEN 'PENDING' THEN 1
        WHEN 'PROCESSING' THEN 2
        WHEN 'PAID' THEN 3
        WHEN 'SHIPPED' THEN 4
        WHEN 'DELIVERED' THEN 5
        ELSE 6
      END
  `);

  return result.rows.map((row) => ({
    status: row.order_status,
    count: row.total,
  }));
}

async function getRecentOrders() {
  const result = await query(`
    SELECT
      o.order_number,
      o.order_status,
      o.total_amount,
      o.currency_code,
      o.placed_at,
      CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
      COALESCE(p.payment_status, 'PENDING') AS payment_status,
      COALESCE(s.shipment_status, 'PENDING') AS shipment_status
    FROM orders o
    INNER JOIN customers c
      ON c.id = o.customer_id
    LEFT JOIN payments p
      ON p.order_id = o.id
    LEFT JOIN shipments s
      ON s.order_id = o.id
    ORDER BY o.placed_at DESC
    LIMIT 5
  `);

  return result.rows.map((row) => ({
    orderNumber: row.order_number,
    customerName: row.customer_name,
    status: row.order_status,
    paymentStatus: row.payment_status,
    shipmentStatus: row.shipment_status,
    total: toNumber(row.total_amount),
    currency: row.currency_code,
    placedAt: row.placed_at,
  }));
}

async function getWarehouses() {
  const result = await query(`
    SELECT
      w.code,
      w.name,
      w.city,
      w.country,
      w.capacity_units,
      COALESCE(SUM(i.quantity_on_hand), 0)::int AS quantity_on_hand,
      ROUND(
        (
          COALESCE(SUM(i.quantity_on_hand), 0)::numeric
          / NULLIF(w.capacity_units, 0)
        ) * 100,
        1
      ) AS utilization
    FROM warehouses w
    LEFT JOIN inventory i
      ON i.warehouse_id = w.id
    WHERE w.is_active = TRUE
    GROUP BY w.id
    ORDER BY utilization DESC NULLS LAST, w.name ASC
  `);

  return result.rows.map((row) => ({
    code: row.code,
    name: row.name,
    city: row.city,
    country: row.country,
    capacityUnits: row.capacity_units,
    quantityOnHand: row.quantity_on_hand,
    utilization: toNumber(row.utilization || 0),
  }));
}

async function getCurrencies() {
  const result = await query(`
    WITH base_currency AS (
      SELECT code
      FROM currencies
      WHERE is_base = TRUE
      LIMIT 1
    ),
    latest_rates AS (
      SELECT DISTINCT ON (er.target_currency_code)
        er.target_currency_code,
        er.rate,
        er.effective_at
      FROM exchange_rates er
      INNER JOIN base_currency bc
        ON bc.code = er.base_currency_code
      ORDER BY er.target_currency_code, er.effective_at DESC
    )
    SELECT
      c.code,
      c.name,
      c.symbol,
      c.is_base,
      COALESCE(lr.rate, 1) AS rate,
      lr.effective_at
    FROM currencies c
    LEFT JOIN latest_rates lr
      ON lr.target_currency_code = c.code
    ORDER BY c.code ASC
  `);

  return result.rows.map((row) => ({
    code: row.code,
    name: row.name,
    symbol: row.symbol,
    isBase: row.is_base,
    rate: toNumber(row.rate),
    effectiveAt: row.effective_at,
  }));
}

async function getHomepageData() {
  const [
    metrics,
    pipeline,
    recentOrders,
    warehouses,
    currencies,
    featuredCategories,
    featuredProducts,
  ] = await Promise.all([
    getMetrics(),
    getPipeline(),
    getRecentOrders(),
    getWarehouses(),
    getCurrencies(),
    listCategories(4),
    listProducts({ featuredOnly: true, limit: 6 }),
  ]);

  return {
    updatedAt: new Date().toISOString(),
    hero: {
      eyebrow: 'RealCommerce operations cockpit',
      title: 'Operate catalog, orders, and fulfilment from one resilient commerce stack.',
      subtitle:
        'This homepage is backed by PostgreSQL and an Express API so merchandising, warehouse activity, exchange rates, and order flow stay in one operational view.',
      primaryCta: {
        label: 'Browse featured SKUs',
        href: '#featured-products',
      },
      secondaryCta: {
        label: 'Review order flow',
        href: '#operations',
      },
    },
    highlights: [
      {
        title: 'Catalog depth',
        text: 'Products, categories, and attribute matrices are modeled in PostgreSQL for clean API reads.',
      },
      {
        title: 'Fulfilment visibility',
        text: 'Inventory sits across multiple warehouses with utilization and reorder thresholds ready for expansion.',
      },
      {
        title: 'Commercial context',
        text: 'Orders, payments, shipments, and exchange rates are linked so the homepage can surface real operating signals.',
      },
    ],
    metrics,
    featuredCategories,
    featuredProducts,
    operations: {
      pipeline,
      recentOrders,
      warehouses,
      currencies,
    },
  };
}

module.exports = {
  getHomepageData,
};
