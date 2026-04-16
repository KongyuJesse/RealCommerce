const { normalizeEmail } = require('../utils/validation');
const { getClientIp } = require('../utils/request');

const buckets = new Map();
let sweepCounter = 0;

const pruneExpiredBuckets = (now) => {
  sweepCounter += 1;

  if (sweepCounter % 50 !== 0) {
    return;
  }

  for (const [key, entry] of buckets.entries()) {
    if (entry.resetAt <= now) {
      buckets.delete(key);
    }
  }
};

const createAuthRateLimit = ({ bucketName, maxAttempts, windowMs }) => {
  const safeMaxAttempts = Math.max(1, Number(maxAttempts) || 1);
  const safeWindowMs = Math.max(1000, Number(windowMs) || 60_000);

  return (request, response, next) => {
    const now = Date.now();
    pruneExpiredBuckets(now);

    const email = normalizeEmail(request.body?.email || '');
    const ipAddress = getClientIp(request);
    const key = `${bucketName}:${ipAddress}:${email || 'anonymous'}`;
    const existing = buckets.get(key);

    if (!existing || existing.resetAt <= now) {
      buckets.set(key, {
        count: 1,
        resetAt: now + safeWindowMs,
      });
    } else {
      existing.count += 1;
    }

    const state = buckets.get(key);
    const remaining = Math.max(0, safeMaxAttempts - state.count);

    response.setHeader('X-RateLimit-Limit', safeMaxAttempts);
    response.setHeader('X-RateLimit-Remaining', remaining);
    response.setHeader('X-RateLimit-Reset', Math.ceil(state.resetAt / 1000));

    if (state.count > safeMaxAttempts) {
      response.setHeader('Retry-After', Math.ceil((state.resetAt - now) / 1000));
      response.status(429).json({
        error: 'RATE_LIMITED',
        message: 'Too many authentication attempts. Please wait a few minutes and try again.',
        requestId: request.requestId,
      });
      return;
    }

    next();
  };
};

module.exports = {
  createAuthRateLimit,
};
