const dotenv = require('dotenv');
const { normalizeOrigin } = require('./utils/origin');

dotenv.config({ quiet: true });

const getFirstNonEmptyEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const parseBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const parseNumber = (value, fallback) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const parseOrigins = (value) =>
  String(value || '')
    .split(',')
    .map((entry) => normalizeOrigin(entry))
    .filter(Boolean);

const parseTrustProxy = (value, fallback) => {
  if (value === undefined || value === null || value === '') {
    return fallback;
  }

  if (value === 'true') {
    return true;
  }

  if (value === 'false') {
    return false;
  }

  const numericValue = Number(value);
  if (Number.isInteger(numericValue) && numericValue >= 0) {
    return numericValue;
  }

  return value;
};

const defaultSessionSecret = 'realcommerce-dev-session-secret';
const resolvedSessionSecret =
  getFirstNonEmptyEnv('SESSION_SECRET', 'REALCOMMERCE_SESSION_SECRET') || defaultSessionSecret;
const nodeEnv = process.env.NODE_ENV || 'development';

const config = {
  appName: process.env.APP_NAME || 'realcommerce-api',
  nodeEnv,
  port: parseNumber(process.env.PORT, 4000),
  apiPrefix: process.env.API_PREFIX || '/api',
  trustProxy: parseTrustProxy(process.env.TRUST_PROXY, nodeEnv === 'production' ? 1 : false),
  logLevel: (process.env.LOG_LEVEL || (nodeEnv === 'production' ? 'info' : 'debug')).toLowerCase(),
  logFormat: (process.env.LOG_FORMAT || (nodeEnv === 'production' ? 'json' : 'pretty')).toLowerCase(),

  // CORS
  clientOrigins: parseOrigins(getFirstNonEmptyEnv('CLIENT_ORIGIN') || 'http://localhost:3000'),
  clientOriginRegex: String(process.env.CLIENT_ORIGIN_REGEX || '').trim(),

  // Database
  databaseUrl: process.env.DATABASE_URL || '',
  pgHost: process.env.PGHOST || 'localhost',
  pgPort: parseNumber(process.env.PGPORT, 5432),
  pgUser: process.env.PGUSER || 'postgres',
  pgPassword: process.env.PGPASSWORD || '',
  pgDatabase: process.env.PGDATABASE || 'realcommerce',
  pgMaintenanceDb: process.env.PG_MAINTENANCE_DB || 'postgres',
  pgSsl: parseBoolean(process.env.PGSSL, false),
  dbPoolMax: parseNumber(process.env.DB_POOL_MAX, 10),
  dbIdleTimeoutMs: parseNumber(process.env.DB_IDLE_TIMEOUT_MS, 30000),
  dbConnectionTimeoutMs: parseNumber(process.env.DB_CONNECTION_TIMEOUT_MS, 10000),
  dbStatementTimeoutMs: parseNumber(process.env.DB_STATEMENT_TIMEOUT_MS, 15000),
  dbQueryTimeoutMs: parseNumber(process.env.DB_QUERY_TIMEOUT_MS, 15000),

  // Sessions
  sessionSecret: resolvedSessionSecret,
  isDefaultSessionSecret: resolvedSessionSecret === defaultSessionSecret,
  sessionSecretSource: getFirstNonEmptyEnv('SESSION_SECRET')
    ? 'SESSION_SECRET'
    : getFirstNonEmptyEnv('REALCOMMERCE_SESSION_SECRET')
      ? 'REALCOMMERCE_SESSION_SECRET'
      : 'default',
  sessionCookieName: process.env.SESSION_COOKIE_NAME || 'rc_session',
  sessionTtlDays: parseNumber(process.env.SESSION_TTL_DAYS, 14),
  sessionCookieDomain: process.env.SESSION_COOKIE_DOMAIN || '',
  sessionCookieSecure: parseBoolean(process.env.SESSION_COOKIE_SECURE, nodeEnv === 'production'),
  sessionCookieSameSite:
    process.env.SESSION_COOKIE_SAME_SITE || (nodeEnv === 'production' ? 'None' : 'Lax'),

  // Auth rate limiting (per IP + email, per window)
  authRateLimitWindowMs: parseNumber(process.env.AUTH_RATE_LIMIT_WINDOW_MS, 10 * 60 * 1000),
  authLoginRateLimitMaxAttempts: parseNumber(process.env.AUTH_LOGIN_RATE_LIMIT_MAX_ATTEMPTS, 8),
  authRegisterRateLimitMaxAttempts: parseNumber(process.env.AUTH_REGISTER_RATE_LIMIT_MAX_ATTEMPTS, 4),

  // Global API rate limiting (per IP, all routes)
  globalRateLimitWindowMs: parseNumber(process.env.GLOBAL_RATE_LIMIT_WINDOW_MS, 15 * 60 * 1000),
  globalRateLimitMaxRequests: parseNumber(process.env.GLOBAL_RATE_LIMIT_MAX_REQUESTS, 300),

  // Commerce defaults
  taxRate: parseNumber(process.env.TAX_RATE, 0.075),
  freeShippingThreshold: parseNumber(process.env.FREE_SHIPPING_THRESHOLD, 1200),

  // External service sync
  exchangeRateProvider: (process.env.EXCHANGE_RATE_PROVIDER || 'frankfurter').toLowerCase(),
  exchangeRateProviderBaseUrl: process.env.EXCHANGE_RATE_PROVIDER_BASE_URL || 'https://api.frankfurter.app',
  exchangeRateSyncEnabled: parseBoolean(process.env.EXCHANGE_RATE_SYNC_ENABLED, nodeEnv !== 'test'),
  exchangeRateSyncIntervalMs: parseNumber(process.env.EXCHANGE_RATE_SYNC_INTERVAL_MS, 60 * 60 * 1000),
  exchangeRateSyncTimeoutMs: parseNumber(process.env.EXCHANGE_RATE_SYNC_TIMEOUT_MS, 10000),

  // Media storage
  mediaStorageProvider: process.env.MEDIA_STORAGE_PROVIDER || 'gcs',
  gcsProjectId: process.env.GCS_PROJECT_ID || '',
  gcsBucketName: process.env.GCS_BUCKET_NAME || '',
  gcsKeyFilename: process.env.GCS_KEY_FILENAME || '',
  gcsCredentialsJson: process.env.GCS_CREDENTIALS_JSON || '',
  gcsCredentialsBase64: process.env.GCS_CREDENTIALS_BASE64 || '',
  gcsUploadUrlExpiresSeconds: parseNumber(process.env.GCS_UPLOAD_URL_EXPIRES_SECONDS, 900),
  gcsPublicBaseUrl: process.env.GCS_PUBLIC_BASE_URL || '',
  renderExternalUrl: getFirstNonEmptyEnv('RENDER_EXTERNAL_URL'),
};

const configErrors = [];

if (!['development', 'test', 'production'].includes(config.nodeEnv)) {
  configErrors.push(`Unsupported NODE_ENV "${config.nodeEnv}".`);
}

if (!['debug', 'info', 'warn', 'error'].includes(config.logLevel)) {
  configErrors.push(`Unsupported LOG_LEVEL "${config.logLevel}".`);
}

if (!['pretty', 'json'].includes(config.logFormat)) {
  configErrors.push(`Unsupported LOG_FORMAT "${config.logFormat}".`);
}

if (!['frankfurter'].includes(config.exchangeRateProvider)) {
  configErrors.push(`Unsupported EXCHANGE_RATE_PROVIDER "${config.exchangeRateProvider}".`);
}

if (!Number.isInteger(config.exchangeRateSyncIntervalMs) || config.exchangeRateSyncIntervalMs < 60000) {
  configErrors.push('EXCHANGE_RATE_SYNC_INTERVAL_MS must be an integer of at least 60000.');
}

if (!Number.isInteger(config.exchangeRateSyncTimeoutMs) || config.exchangeRateSyncTimeoutMs < 1000) {
  configErrors.push('EXCHANGE_RATE_SYNC_TIMEOUT_MS must be an integer of at least 1000.');
}

if (config.clientOriginRegex) {
  try {
    // Validate the regex once at startup so config failures are explicit.
    // eslint-disable-next-line no-new
    new RegExp(config.clientOriginRegex);
  } catch (error) {
    configErrors.push(`CLIENT_ORIGIN_REGEX is invalid: ${error.message}`);
  }
}

if (config.nodeEnv === 'production') {
  if (config.isDefaultSessionSecret || String(config.sessionSecret).length < 32) {
    configErrors.push(
      'SESSION_SECRET (or REALCOMMERCE_SESSION_SECRET) must be set to a strong non-default value with at least 32 characters in production.'
    );
  }

  if (!config.databaseUrl && (!config.pgHost || !config.pgUser || !config.pgDatabase)) {
    configErrors.push(
      'Database configuration is incomplete. Set DATABASE_URL or the PGHOST/PGUSER/PGDATABASE values in production.'
    );
  }

  if (config.clientOrigins.length === 0 && !config.clientOriginRegex) {
    configErrors.push('CLIENT_ORIGIN or CLIENT_ORIGIN_REGEX must be configured in production.');
  }
}

if (configErrors.length > 0) {
  throw new Error(`Invalid RealCommerce configuration:\n- ${configErrors.join('\n- ')}`);
}

module.exports = config;
