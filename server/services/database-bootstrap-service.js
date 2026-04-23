const fs = require('fs/promises');
const path = require('path');
const { Client } = require('pg');
const config = require('../config');
const { logger } = require('../utils/logger');

const CORE_SCHEMA_TABLES = ['roles', 'users', 'customer_tiers', 'currencies', 'products', 'orders'];
const sqlDirectory = path.join(__dirname, '..', 'sql');
const ssl = (config.pgSsl || config.databaseUrl) ? { rejectUnauthorized: false } : false;

const getConnection = (database = config.pgDatabase) =>
  config.databaseUrl
    ? { connectionString: config.databaseUrl, ssl }
    : {
        host: config.pgHost,
        port: config.pgPort,
        user: config.pgUser,
        password: config.pgPassword,
        database,
        ssl,
      };

const runSqlFile = async (client, fileName) => {
  const filePath = path.join(sqlDirectory, fileName);
  const sql = await fs.readFile(filePath, 'utf8');
  await client.query(sql);
};

const ensureDatabaseExists = async () => {
  if (config.databaseUrl) {
    return { created: false, mode: 'database_url' };
  }

  const client = new Client(getConnection(config.pgMaintenanceDb));
  await client.connect();

  try {
    const exists = await client.query('SELECT 1 FROM pg_database WHERE datname = $1', [config.pgDatabase]);

    if (exists.rowCount === 0) {
      await client.query(`CREATE DATABASE "${config.pgDatabase}"`);
      return { created: true, mode: 'created' };
    }

    return { created: false, mode: 'existing' };
  } finally {
    await client.end();
  }
};

const getCoreSchemaState = async (client) => {
  const projection = CORE_SCHEMA_TABLES.map(
    (tableName) => `to_regclass('public.${tableName}') IS NOT NULL AS ${tableName}`
  ).join(',\n        ');

  const result = await client.query(
    `
      SELECT
        ${projection}
    `
  );

  const row = result.rows[0] || {};
  const existing = CORE_SCHEMA_TABLES.filter((tableName) => row[tableName] === true);
  const missing = CORE_SCHEMA_TABLES.filter((tableName) => row[tableName] !== true);

  return { existing, missing };
};

const bootstrapFreshDatabase = async (client, options = {}) => {
  const includeSeedData = options.includeSeedData !== false;

  await runSqlFile(client, 'schema.sql');

  if (includeSeedData) {
    await runSqlFile(client, 'seed.sql');
  }

  return { seeded: includeSeedData };
};

const ensureDatabaseBootstrapped = async (client, options = {}) => {
  const { existing, missing } = await getCoreSchemaState(client);

  if (missing.length === 0) {
    return {
      bootstrapped: false,
      reason: 'schema_present',
      existing,
      missing,
    };
  }

  if (existing.length === 0) {
    logger.warn('Database is missing the base schema. Bootstrapping a fresh database before applying upgrades.', {
      database: config.databaseUrl ? 'DATABASE_URL' : config.pgDatabase,
      includeSeedData: options.includeSeedData !== false,
    });

    await bootstrapFreshDatabase(client, options);

    const refreshedState = await getCoreSchemaState(client);
    if (refreshedState.missing.length > 0) {
      throw new Error(
        `Fresh database bootstrap did not create the required base schema tables: ${refreshedState.missing.join(', ')}`
      );
    }

    return {
      bootstrapped: true,
      reason: 'fresh_database',
      existing: refreshedState.existing,
      missing: refreshedState.missing,
    };
  }

  throw new Error(
    `Database schema is partially initialized. Missing base tables: ${missing.join(', ')}. Existing base tables: ${existing.join(', ')}. Run \`npm run db:init\` manually on a disposable database or restore a complete schema before starting the API.`
  );
};

module.exports = {
  bootstrapFreshDatabase,
  ensureDatabaseBootstrapped,
  ensureDatabaseExists,
  getConnection,
  getCoreSchemaState,
  runSqlFile,
};
