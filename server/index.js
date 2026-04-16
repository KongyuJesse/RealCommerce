const app = require('./app');
const config = require('./config');
const { pool } = require('./db');
const {
  startExchangeRateSyncScheduler,
  stopExchangeRateSyncScheduler,
} = require('./services/exchange-rate-sync-service');
const { applySchemaUpgrades } = require('./services/schema-upgrades');
const { logger } = require('./utils/logger');

let server;

const closeGracefully = async (signal) => {
  logger.info('Shutdown signal received', { signal });

  if (server) {
    await new Promise((resolve) => server.close(resolve));
  }

  stopExchangeRateSyncScheduler();
  await pool.end();
  process.exit(0);
};

const start = async () => {
  await applySchemaUpgrades();

  server = app.listen(config.port, () => {
    logger.info('RealCommerce API listening', {
      port: config.port,
      env: config.nodeEnv,
      apiPrefix: config.apiPrefix,
      healthPath: `${config.apiPrefix}/health`,
      readyPath: `${config.apiPrefix}/ready`,
      storageProvider: config.mediaStorageProvider,
      clientOrigins: config.clientOrigins,
    });
  });

  startExchangeRateSyncScheduler();
};

process.on('SIGTERM', () => {
  closeGracefully('SIGTERM').catch((error) => {
    logger.error('Graceful shutdown failed', { signal: 'SIGTERM', error });
    process.exit(1);
  });
});

process.on('SIGINT', () => {
  closeGracefully('SIGINT').catch((error) => {
    logger.error('Graceful shutdown failed', { signal: 'SIGINT', error });
    process.exit(1);
  });
});

process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection', { error });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception', { error });
  process.exit(1);
});

start().catch((error) => {
  logger.error('Failed to start RealCommerce API', { error });
  process.exit(1);
});
