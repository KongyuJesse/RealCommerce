const compression = require('compression');
const cors = require('cors');
const crypto = require('crypto');
const express = require('express');
const helmet = require('helmet');
const config = require('./config');
const { loadCurrentUser } = require('./services/auth-service');
const { geoMiddleware } = require('./services/geo-service');
const { createApiRouter } = require('./routes/api');
const { createStaffPortalRouter } = require('./routes/staff-portal');
const { buildCookieHeader, parseCookies } = require('./utils/http');
const { logger } = require('./utils/logger');
const { bytesToHuman, durationMsFrom, formatDuration, getClientIp } = require('./utils/request');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', config.trustProxy);

const allowedOriginRegex = config.clientOriginRegex ? new RegExp(config.clientOriginRegex) : null;

const isAllowedOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  if (config.clientOrigins.includes(origin)) {
    return true;
  }

  return Boolean(allowedOriginRegex && allowedOriginRegex.test(origin));
};

app.use((request, response, next) => {
  request.requestId = crypto.randomUUID();
  request.startedAt = process.hrtime.bigint();
  response.setHeader('X-Request-Id', request.requestId);
  next();
});

app.use((request, response, next) => {
  response.on('finish', () => {
    const durationMs = durationMsFrom(request.startedAt);
    const path = request.originalUrl || request.url || '';
    const statusCode = response.statusCode;

    if (
      config.nodeEnv === 'production' &&
      statusCode < 400 &&
      (path === `${config.apiPrefix}/health` || path === `${config.apiPrefix}/ready`)
    ) {
      return;
    }

    const level =
      statusCode >= 500
        ? 'error'
        : statusCode >= 400
          ? 'warn'
          : path === `${config.apiPrefix}/health`
            ? 'debug'
            : 'info';

    logger[level]('HTTP request completed', {
      requestId: request.requestId,
      method: request.method,
      path,
      statusCode,
      duration: formatDuration(durationMs),
      bytes: bytesToHuman(response.getHeader('content-length')),
      ip: getClientIp(request),
      userId: request.currentUser?.user_id || null,
      userAgent: request.headers['user-agent'] || '',
    });
  });

  next();
});

app.use((request, response, next) => {
  const origin = request.headers.origin;

  if (origin && !isAllowedOrigin(origin)) {
    logger.warn('Blocked request from disallowed origin', {
      requestId: request.requestId,
      origin,
      path: request.originalUrl || request.url,
    });
    response.status(403).json({
      error: 'CORS_ORIGIN_DENIED',
      message: 'Origin not allowed.',
      requestId: request.requestId,
    });
    return;
  }

  next();
});

app.use(cors({ origin: (origin, callback) => callback(null, isAllowedOrigin(origin)), credentials: true }));

app.use(
  helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        scriptSrc: ["'self'"],
        styleSrc: ["'self'", "'unsafe-inline'", 'https://fonts.googleapis.com'],
        fontSrc: ["'self'", 'https://fonts.gstatic.com'],
        imgSrc: ["'self'", 'data:', 'https:', 'blob:'],
        connectSrc: ["'self'"],
        upgradeInsecureRequests: config.nodeEnv === 'production' ? [] : null,
      },
    },
  })
);

app.use(compression());
app.use(express.json({ limit: '1mb', strict: true, type: ['application/json', 'application/*+json'] }));
app.use(express.urlencoded({ extended: false, limit: '50kb' }));

const globalBuckets = new Map();
let globalSweepCounter = 0;

app.use(config.apiPrefix, (request, response, next) => {
  const now = Date.now();

  globalSweepCounter += 1;
  if (globalSweepCounter % 100 === 0) {
    for (const [key, entry] of globalBuckets.entries()) {
      if (entry.resetAt <= now) {
        globalBuckets.delete(key);
      }
    }
  }

  const ip = getClientIp(request);
  const key = `global:${ip}`;
  const existing = globalBuckets.get(key);

  if (!existing || existing.resetAt <= now) {
    globalBuckets.set(key, { count: 1, resetAt: now + config.globalRateLimitWindowMs });
  } else {
    existing.count += 1;
  }

  const state = globalBuckets.get(key);
  const remaining = Math.max(0, config.globalRateLimitMaxRequests - state.count);

  response.setHeader('X-RateLimit-Limit', config.globalRateLimitMaxRequests);
  response.setHeader('X-RateLimit-Remaining', remaining);
  response.setHeader('X-RateLimit-Reset', Math.ceil(state.resetAt / 1000));

  if (state.count > config.globalRateLimitMaxRequests) {
    const retryAfterSeconds = Math.ceil((state.resetAt - now) / 1000);
    response.setHeader('Retry-After', retryAfterSeconds);
    response.status(429).json({
      error: 'RATE_LIMITED',
      message: 'Too many requests. Please slow down.',
      retryAfterSeconds,
      requestId: request.requestId,
    });
    return;
  }

  next();
});

const clearSessionCookieHeader = buildCookieHeader({
  name: config.sessionCookieName,
  value: '',
  secure: config.sessionCookieSecure,
  maxAgeSeconds: 0,
  sameSite: config.sessionCookieSameSite,
  domain: config.sessionCookieDomain,
});

app.use(geoMiddleware);

app.use(async (request, _response, next) => {
  try {
    const cookies = parseCookies(request.headers.cookie);
    const sessionToken = cookies[config.sessionCookieName] || null;
    request.sessionToken = sessionToken;
    request.currentUser = await loadCurrentUser(sessionToken);
    next();
  } catch (error) {
    next(error);
  }
});

app.use(
  config.apiPrefix,
  createApiRouter({ loadSessionUser: loadCurrentUser, clearSessionCookieHeader })
);

/* ── Secret staff portal — non-obvious path ── */
app.use(
  '/api/x7k9m',
  createStaffPortalRouter({ loadSessionUser: loadCurrentUser, clearSessionCookieHeader })
);

app.use((request, response) => {
  response.status(404).json({
    error: 'NOT_FOUND',
    message: 'The requested resource was not found.',
    requestId: request.requestId,
  });
});

app.use((error, request, response, _next) => {
  const status = error.status || error.statusCode || 500;
  const isOperational = status < 500;

  if (!isOperational) {
    logger.error('Unhandled request error', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      error,
    });
  } else {
    logger.warn('Request failed', {
      requestId: request.requestId,
      method: request.method,
      path: request.originalUrl || request.url,
      statusCode: status,
      message: error.message,
    });
  }

  response.status(status).json({
    error:
      error.code ||
      (status === 404
        ? 'NOT_FOUND'
        : status === 401
          ? 'UNAUTHORIZED'
          : status === 403
            ? 'FORBIDDEN'
            : 'INTERNAL_ERROR'),
    message: isOperational
      ? error.message || 'Request failed.'
      : 'An unexpected error occurred. Please try again.',
    requestId: request.requestId,
    ...(config.nodeEnv !== 'production' && !isOperational ? { stack: error.stack } : {}),
  });
});

module.exports = app;
