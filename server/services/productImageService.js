const { query } = require('../db');
const { config } = require('../config');
const {
  buildObjectPath,
  buildPublicUrl,
  createUploadUrl,
  isStorageConfigured,
  objectExists,
} = require('./storageService');

function normalizeImageRow(row) {
  return {
    id: row.id,
    productId: row.product_id,
    storageProvider: row.storage_provider,
    bucketName: row.bucket_name,
    objectPath: row.object_path,
    publicUrl: row.public_url,
    sourceUrl: row.source_url,
    mimeType: row.mime_type,
    altText: row.alt_text,
    width: row.width,
    height: row.height,
    fileSizeBytes: row.file_size_bytes,
    displayOrder: row.display_order,
    isPrimary: row.is_primary,
    assetStatus: row.asset_status,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

async function ensureProductExists(productId) {
  const result = await query('SELECT id FROM products WHERE id = $1', [productId]);
  if (result.rowCount === 0) {
    throw new Error('Product not found.');
  }
}

async function listProductImages(productId) {
  const result = await query(
    `
      SELECT *
      FROM product_images
      WHERE product_id = $1
      ORDER BY is_primary DESC, display_order ASC, id ASC
    `,
    [productId]
  );

  return result.rows.map(normalizeImageRow);
}

async function createProductImageUpload({
  productId,
  fileName,
  contentType,
  altText,
  isPrimary,
}) {
  if (!isStorageConfigured()) {
    throw new Error(
      'Google Cloud Storage is not configured. Set GCS_BUCKET_NAME and credentials first.'
    );
  }

  await ensureProductExists(productId);

  const objectPath = buildObjectPath({ productId, fileName });
  const uploadUrl = await createUploadUrl({ objectPath, contentType });

  const result = await query(
    `
      INSERT INTO product_images (
        product_id,
        storage_provider,
        bucket_name,
        object_path,
        mime_type,
        alt_text,
        is_primary,
        asset_status
      )
      VALUES ($1, 'gcs', $2, $3, $4, $5, $6, 'PENDING')
      RETURNING *
    `,
    [
      productId,
      config.storage.bucketName || null,
      objectPath,
      contentType,
      altText || null,
      Boolean(isPrimary),
    ]
  );

  return {
    uploadUrl,
    image: normalizeImageRow(result.rows[0]),
  };
}

async function completeProductImageUpload(imageId, metadata = {}) {
  const lookup = await query('SELECT * FROM product_images WHERE id = $1', [imageId]);
  if (lookup.rowCount === 0) {
    throw new Error('Image upload record not found.');
  }

  const image = lookup.rows[0];

  if (image.storage_provider === 'gcs') {
    const exists = await objectExists(image.object_path);
    if (!exists) {
      throw new Error('Uploaded object was not found in Google Cloud Storage.');
    }
  }

  if (image.is_primary) {
    await query(
      `
        UPDATE product_images
        SET is_primary = FALSE, updated_at = NOW()
        WHERE product_id = $1 AND id <> $2
      `,
      [image.product_id, imageId]
    );
  }

  const result = await query(
    `
      UPDATE product_images
      SET
        public_url = $2,
        width = $3,
        height = $4,
        file_size_bytes = $5,
        asset_status = 'READY',
        updated_at = NOW()
      WHERE id = $1
      RETURNING *
    `,
    [
      imageId,
      image.storage_provider === 'gcs'
        ? buildPublicUrl(image.object_path)
        : image.public_url,
      metadata.width || null,
      metadata.height || null,
      metadata.fileSizeBytes || null,
    ]
  );

  return normalizeImageRow(result.rows[0]);
}

module.exports = {
  completeProductImageUpload,
  createProductImageUpload,
  listProductImages,
};
