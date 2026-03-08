const express = require('express');
const { config } = require('../config');
const { query } = require('../db');

const router = express.Router();

router.get('/health', async (_request, response) => {
  try {
    const result = await query(
      'SELECT current_database() AS database_name, NOW() AS checked_at'
    );

    response.json({
      status: 'ok',
      environment: config.app.nodeEnv,
      database: result.rows[0].database_name,
      checkedAt: result.rows[0].checked_at,
    });
  } catch (_error) {
    response.status(503).json({
      status: 'degraded',
      environment: config.app.nodeEnv,
      message: 'API is running but PostgreSQL is unavailable.',
    });
  }
});

module.exports = router;
