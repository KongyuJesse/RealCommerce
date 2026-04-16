const { pool } = require('../db');

const getWeeklyCategorySales = async ({ weeksBack = 12 } = {}) => {
  const { rows } = await pool.query(
    `
      WITH weekly_sales AS (
        SELECT
          cat.id AS category_id,
          cat.name AS category_name,
          TO_CHAR(DATE_TRUNC('week', o.placed_at), 'IYYY-IW') AS year_week,
          DATE_TRUNC('week', o.placed_at) AS week_start,
          SUM(oi.line_total) AS total_revenue_raw,
          SUM(oi.base_line_total) AS total_revenue_usd,
          SUM(oi.quantity) AS units_sold,
          COUNT(DISTINCT o.id) AS order_count
        FROM orders o
        JOIN order_items oi ON oi.order_id = o.id
        JOIN products p ON p.id = oi.product_id
        JOIN categories cat ON cat.id = p.category_id
        WHERE o.placed_at >= NOW() - ($1 || ' weeks')::INTERVAL
          AND o.order_status <> 'CANCELLED'
        GROUP BY cat.id, cat.name, DATE_TRUNC('week', o.placed_at)
      )
      SELECT
        *,
        RANK() OVER (PARTITION BY year_week ORDER BY total_revenue_usd DESC) AS rank_in_week
      FROM weekly_sales
      ORDER BY week_start DESC, total_revenue_usd DESC
    `,
    [weeksBack]
  );

  return rows;
};

const getTopProductsByCategory = async ({ limit = 20 } = {}) => {
  const { rows } = await pool.query(
    `
      WITH product_sales AS (
        SELECT
          p.id AS product_id,
          p.name AS product_name,
          p.slug AS product_slug,
          cat.id AS category_id,
          cat.name AS category_name,
          SUM(oi.quantity) AS total_sold,
          SUM(oi.base_line_total) AS total_revenue,
          COUNT(DISTINCT oi.order_id) AS order_count,
          AVG(oi.unit_price) AS avg_price
        FROM order_items oi
        JOIN products p ON p.id = oi.product_id
        JOIN categories cat ON cat.id = p.category_id
        JOIN orders o ON o.id = oi.order_id
        WHERE o.order_status <> 'CANCELLED'
        GROUP BY p.id, p.name, p.slug, cat.id, cat.name
      ),
      ranked AS (
        SELECT
          *,
          RANK() OVER (PARTITION BY category_id ORDER BY total_sold DESC) AS rank_in_category,
          DENSE_RANK() OVER (ORDER BY total_sold DESC) AS global_rank,
          NTILE(10) OVER (ORDER BY total_revenue DESC) AS revenue_decile
        FROM product_sales
      )
      SELECT *
      FROM ranked
      ORDER BY category_id, rank_in_category
      LIMIT $1
    `,
    [limit]
  );

  return rows;
};

const getCustomerTierMatrix = async ({ limit = 50 } = {}) => {
  const { rows } = await pool.query(
    `
      WITH customer_ltv AS (
        SELECT
          c.id AS customer_id,
          CONCAT(c.first_name, ' ', c.last_name) AS customer_name,
          c.email,
          ct.name AS tier_name,
          ct.discount_rate,
          ct.min_lifetime_value,
          COALESCE(c.lifetime_value, 0) AS lifetime_value,
          COUNT(DISTINCT o.id) AS total_orders,
          COALESCE(SUM(o.total_amount), 0) AS total_spent
        FROM customers c
        LEFT JOIN customer_tiers ct ON ct.id = c.tier_id
        LEFT JOIN orders o
          ON o.customer_id = c.id
         AND o.order_status <> 'CANCELLED'
        GROUP BY
          c.id,
          c.first_name,
          c.last_name,
          c.email,
          ct.name,
          ct.discount_rate,
          ct.min_lifetime_value,
          c.lifetime_value
      )
      SELECT
        *,
        RANK() OVER (PARTITION BY tier_name ORDER BY lifetime_value DESC) AS rank_in_tier,
        NTILE(10) OVER (ORDER BY lifetime_value DESC) AS lifetime_value_decile,
        LAG(lifetime_value) OVER (PARTITION BY tier_name ORDER BY lifetime_value DESC) AS prev_ltv
      FROM customer_ltv
      ORDER BY tier_name, rank_in_tier
      LIMIT $1
    `,
    [limit]
  );

  return rows;
};

const getPriceHistory = async ({ productId = null, limit = 100 } = {}) => {
  const params = [limit];
  const productFilter = productId ? 'AND ph.product_id = $2' : '';

  if (productId) {
    params.push(productId);
  }

  const { rows } = await pool.query(
    `
      WITH price_changes AS (
        SELECT
          ph.product_id,
          p.name AS product_name,
          p.slug AS product_slug,
          cat.name AS category_name,
          ph.new_price,
          ph.currency_code,
          ph.changed_at,
          ph.note AS reason,
          LAG(ph.new_price) OVER (PARTITION BY ph.product_id ORDER BY ph.changed_at) AS lag_price,
          LEAD(ph.new_price) OVER (PARTITION BY ph.product_id ORDER BY ph.changed_at) AS lead_price
        FROM price_history ph
        JOIN products p ON p.id = ph.product_id
        LEFT JOIN categories cat ON cat.id = p.category_id
        WHERE TRUE ${productFilter}
      )
      SELECT
        *,
        ROUND((new_price - COALESCE(lag_price, new_price)), 2) AS price_delta,
        CASE
          WHEN lag_price IS NULL THEN 'initial'
          WHEN new_price > lag_price THEN 'increase'
          WHEN new_price < lag_price THEN 'decrease'
          ELSE 'unchanged'
        END AS direction
      FROM price_changes
      ORDER BY product_id, changed_at DESC
      LIMIT $1
    `,
    params
  );

  return rows;
};

const getExchangeRateDashboard = async () => {
  const { rows } = await pool.query(`
    WITH latest_rates AS (
      SELECT DISTINCT ON (base_currency_code, target_currency_code)
        base_currency_code AS from_currency_code,
        target_currency_code AS to_currency_code,
        rate,
        effective_at,
        LAG(rate) OVER (
          PARTITION BY base_currency_code, target_currency_code
          ORDER BY effective_at
        ) AS previous_rate
      FROM exchange_rates
      ORDER BY base_currency_code, target_currency_code, effective_at DESC
    )
    SELECT
      *,
      ROUND(
        ((rate - COALESCE(previous_rate, rate)) / NULLIF(COALESCE(previous_rate, rate), 0)) * 100,
        4
      ) AS pct_change
    FROM latest_rates
    ORDER BY from_currency_code, to_currency_code
  `);

  return rows;
};

const getInventoryHealth = async () => {
  const { rows } = await pool.query(`
    SELECT
      i.id AS inventory_id,
      p.id AS product_id,
      p.name AS product_name,
      p.slug AS product_slug,
      cat.name AS category_name,
      w.id AS warehouse_id,
      w.name AS warehouse_name,
      w.city AS warehouse_city,
      i.quantity_on_hand,
      i.reorder_point,
      i.safety_stock,
      CASE
        WHEN i.quantity_on_hand <= 0 THEN 'out_of_stock'
        WHEN i.quantity_on_hand <= i.safety_stock THEN 'critical'
        WHEN i.quantity_on_hand <= i.reorder_point THEN 'low'
        WHEN i.quantity_on_hand > i.reorder_point * 3 THEN 'overstocked'
        ELSE 'healthy'
      END AS stock_status,
      ROUND((i.quantity_on_hand::numeric / NULLIF(i.reorder_point, 0)) * 100, 1) AS stock_pct
    FROM inventory i
    JOIN products p ON p.id = i.product_id
    LEFT JOIN categories cat ON cat.id = p.category_id
    JOIN warehouses w ON w.id = i.warehouse_id
    ORDER BY
      stock_status = 'out_of_stock' DESC,
      stock_status = 'critical' DESC,
      stock_status = 'low' DESC,
      warehouse_name,
      product_name
  `);

  return rows;
};

const getFullAnalyticsBundle = async () => {
  const [
    weeklyCategorySales,
    topProducts,
    customerTierMatrix,
    priceHistory,
    exchangeRates,
    inventoryHealth,
  ] = await Promise.all([
    getWeeklyCategorySales({ weeksBack: 8 }),
    getTopProductsByCategory({ limit: 30 }),
    getCustomerTierMatrix({ limit: 50 }),
    getPriceHistory({ limit: 80 }),
    getExchangeRateDashboard(),
    getInventoryHealth(),
  ]);

  return {
    weeklyCategorySales,
    topProducts,
    customerTierMatrix,
    priceHistory,
    exchangeRates,
    inventoryHealth,
  };
};

module.exports = {
  getWeeklyCategorySales,
  getTopProductsByCategory,
  getCustomerTierMatrix,
  getPriceHistory,
  getExchangeRateDashboard,
  getInventoryHealth,
  getFullAnalyticsBundle,
};
