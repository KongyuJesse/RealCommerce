const compression = require('compression');
const cors = require('cors');
const express = require('express');
const helmet = require('helmet');
const morgan = require('morgan');
const { config } = require('./config');
const healthRoutes = require('./routes/health');
const catalogRoutes = require('./routes/catalog');
const homepageRoutes = require('./routes/homepage');

function createApp() {
  const app = express();

  app.set('trust proxy', 1);
  app.use(helmet());
  app.use(compression());
  app.use(
    cors({
      origin: config.app.allowedOrigins,
      credentials: false,
    })
  );
  app.use(express.json({ limit: '1mb' }));

  if (!config.app.isTest) {
    app.use(morgan(config.app.isProduction ? 'combined' : 'dev'));
  }

  app.get('/', (_request, response) => {
    response.json({
      service: 'RealCommerce API',
      version: '1.0.0',
      environment: config.app.nodeEnv,
      endpoints: [
        `${config.app.apiPrefix}/health`,
        `${config.app.apiPrefix}/homepage`,
        `${config.app.apiPrefix}/categories`,
        `${config.app.apiPrefix}/products`,
      ],
    });
  });

  app.use(config.app.apiPrefix, healthRoutes);
  app.use(config.app.apiPrefix, catalogRoutes);
  app.use(config.app.apiPrefix, homepageRoutes);

  app.use((_request, response) => {
    response.status(404).json({
      error: 'Not found',
    });
  });

  app.use((error, _request, response, _next) => {
    console.error(error);
    response.status(500).json({
      error: 'Internal server error',
      message: config.app.isProduction ? 'Unexpected server failure.' : error.message,
    });
  });

  return app;
}

module.exports = createApp;
