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

function toRegExpList(value) {
  return (value || '')
    .split(',')
    .map((item) => item.trim())
    .filter(Boolean)
    .reduce((patterns, item) => {
      try {
        patterns.push(new RegExp(item));
      } catch (error) {
        console.warn(`Ignoring invalid regular expression in CLIENT_ORIGIN_REGEX: ${item}`);
      }

      return patterns;
    }, []);
}

function toJsonObject(value, label) {
  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch (error) {
    throw new Error(`Invalid JSON value provided for ${label}.`);
  }
}

function toBase64JsonObject(value, label) {
  if (!value) {
    return null;
  }

  try {
    const decoded = Buffer.from(value, 'base64').toString('utf8');
    return JSON.parse(decoded);
  } catch (error) {
    throw new Error(`Invalid base64 JSON value provided for ${label}.`);
  }
}

const nodeEnv = process.env.NODE_ENV || 'development';
const pgSslEnabled = process.env.PGSSL
  ? process.env.PGSSL === 'true'
  : Boolean(process.env.DATABASE_URL && nodeEnv === 'production');

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
    allowedOriginPatterns: toRegExpList(process.env.CLIENT_ORIGIN_REGEX),
    apiPrefix: process.env.API_PREFIX || '/api',
  },
  database: {
    host: process.env.PGHOST || 'localhost',
    port: toNumber(process.env.PGPORT, 5432),
    user: process.env.PGUSER || 'postgres',
    password: process.env.PGPASSWORD || 'postgres',
    database: process.env.PGDATABASE || 'realcommerce',
    maintenanceDatabase: process.env.PG_MAINTENANCE_DB || 'postgres',
    ssl: pgSslEnabled,
    connectionString: process.env.DATABASE_URL || '',
  },
  storage: {
    provider: process.env.MEDIA_STORAGE_PROVIDER || 'gcs',
    projectId: process.env.GCS_PROJECT_ID || '',
    bucketName: process.env.GCS_BUCKET_NAME || '',
    keyFilename: process.env.GCS_KEY_FILENAME
      ? path.resolve(__dirname, process.env.GCS_KEY_FILENAME)
      : '',
    credentials:
      toJsonObject(process.env.GCS_CREDENTIALS_JSON, 'GCS_CREDENTIALS_JSON') ||
      toBase64JsonObject(
        process.env.GCS_CREDENTIALS_BASE64,
        'GCS_CREDENTIALS_BASE64'
      ),
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
