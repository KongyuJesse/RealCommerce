const express = require('express');
const {
  completeProductImageUpload,
  createProductImageUpload,
  listProductImages,
} = require('../services/productImageService');

const router = express.Router();

function parseInteger(value) {
  const parsed = Number(value);
  return Number.isInteger(parsed) ? parsed : null;
}

router.get('/products/:productId/images', async (request, response, next) => {
  try {
    const productId = parseInteger(request.params.productId);

    if (!productId) {
      response.status(400).json({ error: 'Valid product id is required.' });
      return;
    }

    const images = await listProductImages(productId);
    response.json({ data: images });
  } catch (error) {
    next(error);
  }
});

router.post('/uploads/product-images/sign', async (request, response, next) => {
  try {
    const productId = parseInteger(request.body.productId);
    const fileName = String(request.body.fileName || '').trim();
    const contentType = String(request.body.contentType || '').trim();

    if (!productId || !fileName || !contentType) {
      response.status(400).json({
        error: 'productId, fileName, and contentType are required.',
      });
      return;
    }

    const result = await createProductImageUpload({
      productId,
      fileName,
      contentType,
      altText: request.body.altText,
      isPrimary: request.body.isPrimary,
    });

    response.status(201).json({
      data: {
        method: 'PUT',
        headers: {
          'Content-Type': contentType,
        },
        uploadUrl: result.uploadUrl,
        image: result.image,
      },
    });
  } catch (error) {
    if (error.message.includes('Google Cloud Storage is not configured')) {
      response.status(503).json({ error: error.message });
      return;
    }

    next(error);
  }
});

router.post(
  '/uploads/product-images/:imageId/complete',
  async (request, response, next) => {
    try {
      const imageId = parseInteger(request.params.imageId);

      if (!imageId) {
        response.status(400).json({ error: 'Valid image id is required.' });
        return;
      }

      const image = await completeProductImageUpload(imageId, {
        width: request.body.width,
        height: request.body.height,
        fileSizeBytes: request.body.fileSizeBytes,
      });

      response.json({ data: image });
    } catch (error) {
      next(error);
    }
  }
);

module.exports = router;
