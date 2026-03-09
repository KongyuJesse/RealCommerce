const { query } = require('../db');

function toNumber(value) {
  return Number(value);
}

async function getAttributesForProducts(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const result = await query(
    `
      SELECT
        pav.product_id,
        pa.display_name,
        pav.value_text
      FROM product_attribute_values pav
      INNER JOIN product_attributes pa
        ON pa.id = pav.attribute_id
      WHERE pav.product_id = ANY($1::int[])
      ORDER BY pa.display_name ASC
    `,
    [productIds]
  );

  return result.rows.reduce((grouped, row) => {
    const existing = grouped.get(row.product_id) || [];
    existing.push({
      label: row.display_name,
      value: row.value_text,
    });
    grouped.set(row.product_id, existing);
    return grouped;
  }, new Map());
}

async function getPrimaryImagesForProducts(productIds) {
  if (!productIds.length) {
    return new Map();
  }

  const result = await query(
    `
      SELECT DISTINCT ON (pi.product_id)
        pi.product_id,
        COALESCE(pi.public_url, pi.source_url) AS image_url,
        pi.alt_text
      FROM product_images pi
      WHERE pi.product_id = ANY($1::int[])
        AND pi.asset_status = 'READY'
      ORDER BY pi.product_id, pi.is_primary DESC, pi.display_order ASC, pi.id ASC
    `,
    [productIds]
  );

  return result.rows.reduce((grouped, row) => {
    grouped.set(row.product_id, {
      url: row.image_url,
      alt: row.alt_text,
    });
    return grouped;
  }, new Map());
}

async function listCategories(limit = 4) {
  const result = await query(
    `
      SELECT
        c.id,
        c.name,
        c.slug,
        c.description,
        c.hero_copy,
        cover.image_url,
        cover.alt_text AS image_alt,
        COUNT(p.id)::int AS product_count
      FROM categories c
      LEFT JOIN LATERAL (
        SELECT
          COALESCE(pi.public_url, pi.source_url) AS image_url,
          pi.alt_text
        FROM products p2
        LEFT JOIN product_images pi
          ON pi.product_id = p2.id
         AND pi.asset_status = 'READY'
        WHERE p2.category_id = c.id
        ORDER BY p2.is_featured DESC, pi.is_primary DESC, pi.display_order ASC, p2.created_at DESC
        LIMIT 1
      ) cover ON TRUE
      LEFT JOIN products p
        ON p.category_id = c.id
      WHERE c.is_featured = TRUE
      GROUP BY c.id, cover.image_url, cover.alt_text
      ORDER BY c.name ASC
      LIMIT $1
    `,
    [limit]
  );

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    description: row.description,
    heroCopy: row.hero_copy,
    productCount: row.product_count,
    imageUrl: row.image_url,
    imageAlt: row.image_alt,
  }));
}

async function listProducts({ featuredOnly = false, limit = 6 } = {}) {
  const result = await query(
    `
      SELECT
        p.id,
        p.name,
        p.slug,
        p.sku,
        p.short_description,
        p.unit_price,
        p.currency_code,
        p.launch_month,
        p.status,
        c.name AS category_name,
        COALESCE(SUM(i.quantity_on_hand), 0)::int AS inventory_units
      FROM products p
      INNER JOIN categories c
        ON c.id = p.category_id
      LEFT JOIN inventory i
        ON i.product_id = p.id
      WHERE ($1::boolean = FALSE OR p.is_featured = TRUE)
      GROUP BY p.id, c.name
      ORDER BY p.is_featured DESC, p.created_at DESC, p.name ASC
      LIMIT $2
    `,
    [featuredOnly, limit]
  );

  const productIds = result.rows.map((row) => row.id);
  const attributesByProduct = await getAttributesForProducts(productIds);
  const imagesByProduct = await getPrimaryImagesForProducts(productIds);

  return result.rows.map((row) => ({
    id: row.id,
    name: row.name,
    slug: row.slug,
    sku: row.sku,
    description: row.short_description,
    price: toNumber(row.unit_price),
    currency: row.currency_code,
    launchMonth: row.launch_month,
    status: row.status,
    category: row.category_name,
    inventoryUnits: row.inventory_units,
    attributes: attributesByProduct.get(row.id) || [],
    imageUrl: imagesByProduct.get(row.id)?.url || '',
    imageAlt: imagesByProduct.get(row.id)?.alt || row.name,
  }));
}

module.exports = {
  listCategories,
  listProducts,
};
