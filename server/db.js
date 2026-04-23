const { Pool } = require('pg');
const config = require('./config');
const { logger } = require('./utils/logger');

const ssl = (config.pgSsl || config.databaseUrl) ? { rejectUnauthorized: false } : false;

const basePoolConfig = config.databaseUrl
  ? {
      connectionString: config.databaseUrl,
      ssl,
    }
  : {
      host: config.pgHost,
      port: config.pgPort,
      user: config.pgUser,
      password: config.pgPassword,
      database: config.pgDatabase,
      ssl,
    };

const pool = new Pool({
  ...basePoolConfig,
  application_name: config.appName,
  max: config.dbPoolMax,
  idleTimeoutMillis: config.dbIdleTimeoutMs,
  connectionTimeoutMillis: config.dbConnectionTimeoutMs,
  statement_timeout: config.dbStatementTimeoutMs,
  query_timeout: config.dbQueryTimeoutMs,
  keepAlive: true,
});

pool.on('error', (error) => {
  logger.error('Unexpected database pool error', { error });
});

const query = (text, params) => pool.query(text, params);

const TRANSACTION_ISOLATION_LEVELS = new Set([
  'READ COMMITTED',
  'REPEATABLE READ',
  'SERIALIZABLE',
]);

const withTransaction = async (work, options = {}) => {
  const client = await pool.connect();
  const requestedIsolationLevel = String(options.isolationLevel || '')
    .trim()
    .toUpperCase();

  try {
    if (requestedIsolationLevel && TRANSACTION_ISOLATION_LEVELS.has(requestedIsolationLevel)) {
      await client.query(`BEGIN ISOLATION LEVEL ${requestedIsolationLevel}`);
    } else {
      await client.query('BEGIN');
    }
    const result = await work(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  pool,
  query,
  withTransaction,
};
