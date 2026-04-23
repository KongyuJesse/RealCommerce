const normalizeText = (value) => (typeof value === 'string' ? value.trim() : '');

const normalizeNullableText = (value) => {
  const normalized = normalizeText(value);
  return normalized || null;
};

const normalizeBoolean = (value, fallback = false) => {
  if (value === undefined || value === null || value === '') return fallback;
  if (typeof value === 'boolean') return value;
  return ['1', 'true', 'yes', 'on'].includes(String(value).toLowerCase());
};

const roundMoney = (value) => Number(Number(value || 0).toFixed(2));

const mapMoneyRow = (row, fields) =>
  fields.reduce(
    (acc, field) => ({ ...acc, [field]: roundMoney(row[field]) }),
    row
  );

const mapNullableMoneyRow = (row, fields) =>
  fields.reduce(
    (acc, field) => ({
      ...acc,
      [field]: row[field] === null || row[field] === undefined ? null : roundMoney(row[field]),
    }),
    row
  );

module.exports = {
  normalizeText,
  normalizeNullableText,
  normalizeBoolean,
  roundMoney,
  mapMoneyRow,
  mapNullableMoneyRow,
};
