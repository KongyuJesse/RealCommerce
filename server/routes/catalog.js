const express = require('express');
const { listCategories, listProducts } = require('../services/catalogService');

const router = express.Router();

function parseLimit(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return fallback;
  }

  return Math.min(parsed, 24);
}

router.get('/categories', async (request, response, next) => {
  try {
    const limit = parseLimit(request.query.limit, 6);
    const categories = await listCategories(limit);
    response.json({ data: categories });
  } catch (error) {
    next(error);
  }
});

router.get('/products', async (request, response, next) => {
  try {
    const limit = parseLimit(request.query.limit, 12);
    const featuredOnly = request.query.featured === 'true';
    const products = await listProducts({ featuredOnly, limit });
    response.json({ data: products });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
