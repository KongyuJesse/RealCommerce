const isNonEmptyString = (value) => typeof value === 'string' && value.trim().length > 0;

const normalizeEmail = (value) => String(value || '').trim().toLowerCase();

const isEmail = (value) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(value));

const asNumber = (value, fallback = NaN) => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : fallback;
};

const assert = (condition, message, status = 400) => {
  if (!condition) {
    const error = new Error(message);
    error.status = status;
    throw error;
  }
};

module.exports = {
  isNonEmptyString,
  normalizeEmail,
  isEmail,
  asNumber,
  assert,
};
