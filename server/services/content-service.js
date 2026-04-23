const { query } = require('../db');
const { mapMoneyRow } = require('../utils/format');

const mapDecimalRow = (row, fields, precision = 6) =>
  fields.reduce(
    (accumulator, field) => ({
      ...accumulator,
      [field]: Number(Number(row[field] || 0).toFixed(precision)),
    }),
    row
  );

const getContentBlocks = async (blockType) => {
  const result = await query(
    `
      SELECT block_type, slug, eyebrow, title, body, metadata, sort_order
      FROM content_blocks
      WHERE block_type = $1 AND is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `,
    [blockType]
  );

  return result.rows;
};

const getPaymentMethods = async () => {
  const result = await query(
    `
      SELECT id, label, provider
      FROM payment_methods_catalog
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `
  );

  return result.rows;
};

const getShippingMethods = async () => {
  const result = await query(
    `
      SELECT id, label, description, base_amount AS amount, eta_days AS eta_days
      FROM shipping_methods_catalog
      WHERE is_active = TRUE
      ORDER BY sort_order ASC, id ASC
    `
  );

  return result.rows.map((row) => mapMoneyRow(row, ['amount']));
};

const getExchangeRates = async () => {
  const result = await query(
    `
      SELECT
        ler.base_currency_code,
        base_currency.name AS base_currency_name,
        ler.target_currency_code,
        target_currency.name AS target_currency_name,
        ler.rate,
        ler.effective_at
      FROM latest_exchange_rates ler
      JOIN currencies base_currency ON base_currency.code = ler.base_currency_code
      JOIN currencies target_currency ON target_currency.code = ler.target_currency_code
      ORDER BY ler.base_currency_code ASC, ler.target_currency_code ASC
    `
  );

  return result.rows.map((row) => mapDecimalRow(row, ['rate']));
};

const getLookups = async () => {
  const [roles, categories, currencies, warehouses, promotions, paymentMethods, shippingMethods, productAttributes, exchangeRates] = await Promise.all([
    query('SELECT id, name, description FROM roles ORDER BY id'),
    query('SELECT id, name, slug, description, hero_copy, is_featured FROM categories ORDER BY is_featured DESC, name'),
    query('SELECT code, name, symbol, is_base FROM currencies ORDER BY is_base DESC, code'),
    query('SELECT id, code, name, city, country, capacity_units, is_active FROM warehouses ORDER BY is_active DESC, name'),
    query("SELECT code, title, description, discount_type, discount_value, minimum_order_amount FROM promotions WHERE is_active = TRUE AND starts_at <= NOW() AND ends_at >= NOW() ORDER BY code"),
    getPaymentMethods(),
    getShippingMethods(),
    query('SELECT id, name, display_name, value_type FROM product_attributes ORDER BY display_name ASC'),
    getExchangeRates(),
  ]);

  return {
    roles: roles.rows,
    categories: categories.rows,
    currencies: currencies.rows,
    warehouses: warehouses.rows,
    paymentMethods,
    shippingMethods,
    productAttributes: productAttributes.rows,
    exchangeRates,
    promotions: promotions.rows.map((promotion) => mapMoneyRow(promotion, ['discount_value', 'minimum_order_amount'])),
  };
};

const getDemoUsers = async () => {
  const [accounts, accessNotes] = await Promise.all([
    query("SELECT u.email, u.full_name, r.name AS role_name FROM users u JOIN roles r ON r.id = u.role_id WHERE r.name <> 'seller' ORDER BY u.id"),
    getContentBlocks('access_note'),
  ]);

  return {
    passwordHint: accessNotes[0]?.metadata?.passwordHint || '',
    accessNote: accessNotes[0]?.body || '',
    accounts: accounts.rows,
  };
};

module.exports = {
  getContentBlocks,
  getDemoUsers,
  getExchangeRates,
  getLookups,
  getPaymentMethods,
  getShippingMethods,
};
