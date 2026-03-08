const express = require('express');
const { getHomepageData } = require('../services/homepageService');

const router = express.Router();

router.get('/homepage', async (_request, response, next) => {
  try {
    const homepage = await getHomepageData();
    response.json({ data: homepage });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
