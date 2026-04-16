const config = require('../config');

const LEVEL_ORDER = {
  debug: 10,
  info: 20,
  warn: 30,
  error: 40,
};

const ANSI = {
  reset: '\x1b[0m',
  gray: '\x1b[90m',
  cyan: '\x1b[36m',
  yellow: '\x1b[33m',
  red: '\x1b[31m',
};

const resolvedLogLevel = LEVEL_ORDER[config.logLevel] ? config.logLevel : 'info';
const usePrettyLogs =
  config.logFormat === 'pretty' &&
  process.stdout.isTTY &&
  process.env.NO_COLOR !== '1';

const shouldLog = (level) => LEVEL_ORDER[level] >= LEVEL_ORDER[resolvedLogLevel];

const colorize = (level, value) => {
  if (!usePrettyLogs) {
    return value;
  }

  if (level === 'debug') {
    return `${ANSI.gray}${value}${ANSI.reset}`;
  }

  if (level === 'info') {
    return `${ANSI.cyan}${value}${ANSI.reset}`;
  }

  if (level === 'warn') {
    return `${ANSI.yellow}${value}${ANSI.reset}`;
  }

  return `${ANSI.red}${value}${ANSI.reset}`;
};

const serializeValue = (value) => {
  if (value instanceof Error) {
    return {
      name: value.name,
      message: value.message,
      stack: value.stack,
      code: value.code,
      status: value.status || value.statusCode,
    };
  }

  if (Array.isArray(value)) {
    return value.map(serializeValue);
  }

  if (value && typeof value === 'object') {
    return Object.entries(value).reduce((accumulator, [key, item]) => {
      accumulator[key] = serializeValue(item);
      return accumulator;
    }, {});
  }

  return value;
};

const formatPrettyMeta = (meta = {}) => {
  const entries = Object.entries(meta).filter(([, value]) => value !== undefined);

  if (entries.length === 0) {
    return '';
  }

  return ` ${entries
    .map(([key, value]) => {
      if (value === null) {
        return `${key}=null`;
      }

      if (typeof value === 'object') {
        return `${key}=${JSON.stringify(serializeValue(value))}`;
      }

      return `${key}=${JSON.stringify(value)}`;
    })
    .join(' ')}`;
};

const writeLog = (level, message, meta = {}) => {
  if (!shouldLog(level)) {
    return;
  }

  const timestamp = new Date().toISOString();
  const payload = {
    ts: timestamp,
    level,
    service: config.appName,
    env: config.nodeEnv,
    message,
    ...serializeValue(meta),
  };

  if (config.logFormat === 'json') {
    process.stdout.write(`${JSON.stringify(payload)}\n`);
    return;
  }

  const levelLabel = colorize(level, level.toUpperCase().padEnd(5, ' '));
  process.stdout.write(`${timestamp} ${levelLabel} ${message}${formatPrettyMeta(meta)}\n`);
};

const logger = {
  debug: (message, meta) => writeLog('debug', message, meta),
  info: (message, meta) => writeLog('info', message, meta),
  warn: (message, meta) => writeLog('warn', message, meta),
  error: (message, meta) => writeLog('error', message, meta),
};

module.exports = {
  logger,
};
