const bytesToHuman = (value) => {
  const bytes = Number(value);
  if (!Number.isFinite(bytes) || bytes <= 0) {
    return '0 B';
  }

  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const durationMsFrom = (startedAt) => {
  if (typeof startedAt !== 'bigint') {
    return 0;
  }

  return Number(process.hrtime.bigint() - startedAt) / 1_000_000;
};

const formatDuration = (durationMs) => {
  const numericValue = Number(durationMs || 0);
  if (!Number.isFinite(numericValue) || numericValue <= 0) {
    return '0.0ms';
  }

  if (numericValue >= 1000) {
    return `${(numericValue / 1000).toFixed(2)}s`;
  }

  return `${numericValue.toFixed(1)}ms`;
};

const getClientIp = (request) => {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  return request.ip || request.socket?.remoteAddress || 'unknown';
};

module.exports = {
  bytesToHuman,
  durationMsFrom,
  formatDuration,
  getClientIp,
};
