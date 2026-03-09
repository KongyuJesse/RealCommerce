const path = require('path');
const dotenv = require('dotenv');

dotenv.config({
  path: path.resolve(__dirname, '.env'),
});

function toNumber(value, fallback) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function toList(value, fallback) {
  const source = value || fallback;
  return source
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean);
}

const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  app: {
    port: toNumber(process.env.PORT, 4000),
    nodeEnv,
    isProduction: nodeEnv === 'production',
    isTest: nodeEnv === 'test',
    allowedOrigins: toList(
      process.env.CLIENT_ORIGIN,
      'http://localhost:3000'
    ),
    apiPrefix: process.env.API_PREFIX || '/api',
  },
  database: {
    host: process.env.PGHOST || 'localhost',
    port: toNumber(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'realcommerce',
    maintenanceDatabase: process.env.PG_MAINTENANCE_DB || 'postgres',
    ssl: process.env.PGSSL === 'true',
    connectionString: process.env.DATABASE_URL || '',
  },
  storage: {
    provider: process.env.MEDIA_STORAGE_PROVIDER || 'gcs',
    projectId: process.env.GCS_PROJECT_ID || '',
    bucketName: process.env.GCS_BUCKET_NAME || '',
    keyFilename: process.env.GCS_KEY_FILENAME
      ? path.resolve(__dirname, process.env.GCS_KEY_FILENAME)
      : '',
    uploadUrlExpiresSeconds: toNumber(
      process.env.GCS_UPLOAD_URL_EXPIRES_SECONDS,
      900
    ),
    publicBaseUrl: process.env.GCS_PUBLIC_BASE_URL || '',
  },
};

function buildPgConfig(databaseName = config.database.database) {
  const ssl = config.database.ssl ? { rejectUnauthorized: false } : false;

  if (config.database.connectionString) {
    const url = new URL(config.database.connectionString);
    if (databaseName) {
      url.pathname = `/${databaseName}`;
    }

    return {
      connectionString: url.toString(),
      ssl,
    };
  }

  return {
    host: config.database.host,
    port: config.database.port,
    user: config.database.user,
    password: config.database.password,
    database: databaseName,
    ssl,
  };
}

module.exports = {
  config,
  buildPgConfig,
};
