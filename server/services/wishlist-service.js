const { query } = require('../db');
const { assert } = require('../utils/validation');

const ensureWishlistTable = async () => {
  await query(`
    CREATE TABLE IF NOT EXISTS wishlists (
      id SERIAL PRIMARY KEY,
      customer_id INTEGER NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
      product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
      added_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      UNIQUE (customer_id, product_id)
    )
  `);

  await query(`
    CREATE INDEX IF NOT EXISTS idx_wishlists_customer
    ON wishlists(customer_id, added_at DESC)
  `);
};

const getWishlist = async (customerId) => {
  await ensureWishlistTable();

  const result = await query(
    `
      SELECT
        w.id AS wishlist_id,
        w.added_at,
        p.id,
        p.name,
        p.slug,
        p.unit_price,
        p.currency_code,
        p.short_description,
        COALESCE(stock.available_units, 0) AS available_units,
        cat.name AS category_name,
        cat.slug AS category_slug,
        COALESCE(image.public_url, image.source_url) AS image_url
      FROM wishlists w
      JOIN products p ON p.id = w.product_id
      LEFT JOIN categories cat ON cat.id = p.category_id
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
      WHERE w.customer_id = $1
        AND p.status = 'ACTIVE'
      ORDER BY w.added_at DESC
    `,
    [customerId]
  );

  return result.rows;
};

const addToWishlist = async (customerId, productId) => {
  await ensureWishlistTable();

  const product = await query(
    'SELECT id FROM products WHERE id = $1 AND status = $2 LIMIT 1',
    [productId, 'ACTIVE']
  );
  assert(product.rowCount > 0, 'Product not found.', 404);

  const result = await query(
    `
      INSERT INTO wishlists (customer_id, product_id)
      VALUES ($1, $2)
      ON CONFLICT (customer_id, product_id) DO NOTHING
      RETURNING id
    `,
    [customerId, productId]
  );

  return { added: result.rowCount > 0, productId };
};

const removeFromWishlist = async (customerId, productId) => {
  await ensureWishlistTable();

  const result = await query(
    'DELETE FROM wishlists WHERE customer_id = $1 AND product_id = $2',
    [customerId, productId]
  );

  return { removed: result.rowCount > 0, productId };
};

module.exports = {
  ensureWishlistTable,
  getWishlist,
  addToWishlist,
  removeFromWishlist,
};
