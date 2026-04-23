/**
 * seed-admin.js
 *
 * Creates or updates the platform admin account.
 *
 * Usage:
 *   ADMIN_EMAIL=you@example.com ADMIN_PASSWORD=YourPass!123 node server/scripts/seed-admin.js
 *
 * Falls back to SEED_ADMIN_EMAIL / SEED_ADMIN_PASSWORD env vars, then to
 * the values hard-coded below as last-resort defaults for local dev.
 */

const crypto = require('crypto');
const path = require('path');
const { Client } = require('pg');
const dotenv = require('dotenv');

dotenv.config({ path: path.join(__dirname, '..', '.env'), quiet: true });

const config = require('../config');

const getFirstNonEmptyEnv = (...keys) => {
  for (const key of keys) {
    const value = process.env[key];
    if (typeof value === 'string' && value.trim()) {
      return value.trim();
    }
  }

  return '';
};

const defaultAdminEmail = 'admin@realcommerce.com';
const defaultAdminPassword = 'RealCommerce!2026';
const providedAdminEmail = getFirstNonEmptyEnv('ADMIN_EMAIL', 'SEED_ADMIN_EMAIL');
const providedAdminPassword = getFirstNonEmptyEnv('ADMIN_PASSWORD', 'SEED_ADMIN_PASSWORD');
const ADMIN_EMAIL = providedAdminEmail || defaultAdminEmail;
const ADMIN_PASSWORD = providedAdminPassword || defaultAdminPassword;
const ADMIN_NAME = getFirstNonEmptyEnv('ADMIN_NAME') || 'Platform Admin';

const hashPassword = (password) => {
  const salt = crypto.randomBytes(16).toString('hex');
  return `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;
};

const validatePassword = (password) => {
  if (!password || password.length < 10) throw new Error('Password must be at least 10 characters.');
  if (!/[A-Z]/.test(password)) throw new Error('Password must include an uppercase letter.');
  if (!/[a-z]/.test(password)) throw new Error('Password must include a lowercase letter.');
  if (!/\d/.test(password)) throw new Error('Password must include a number.');
  if (!/[^A-Za-z0-9]/.test(password)) throw new Error('Password must include a special character.');
};

const ssl = (config.pgSsl || config.databaseUrl) ? { rejectUnauthorized: false } : false;

const getConnection = () =>
  config.databaseUrl
    ? { connectionString: config.databaseUrl, ssl }
    : {
        host: config.pgHost,
        port: config.pgPort,
        user: config.pgUser,
        password: config.pgPassword,
        database: config.pgDatabase,
        ssl,
      };

const main = async () => {
  if (config.nodeEnv === 'production' && (!providedAdminEmail || !providedAdminPassword)) {
    throw new Error(
      'Set ADMIN_EMAIL and ADMIN_PASSWORD (or SEED_ADMIN_EMAIL and SEED_ADMIN_PASSWORD) before running seed-admin in production.'
    );
  }

  validatePassword(ADMIN_PASSWORD);

  const client = new Client(getConnection());
  await client.connect();

  try {
    if (config.nodeEnv !== 'production' && (!providedAdminEmail || !providedAdminPassword)) {
      console.warn('seed-admin: using local development fallback credentials because admin env vars were not provided.');
    }

    const roleResult = await client.query(
      `SELECT id FROM roles WHERE name = 'admin' LIMIT 1`
    );

    if (roleResult.rowCount === 0) {
      throw new Error("Role 'admin' not found. Run db:init first.");
    }

    const roleId = roleResult.rows[0].id;
    const normalizedEmail = ADMIN_EMAIL.trim().toLowerCase();
    const passwordHash = hashPassword(ADMIN_PASSWORD);

    const existing = await client.query(
      `SELECT id FROM users WHERE LOWER(email) = $1 LIMIT 1`,
      [normalizedEmail]
    );

    if (existing.rowCount > 0) {
      await client.query(
        `UPDATE users SET full_name = $1, password_hash = $2, role_id = $3, is_active = TRUE WHERE LOWER(email) = $4`,
        [ADMIN_NAME, passwordHash, roleId, normalizedEmail]
      );
      console.log(`Admin account updated: ${normalizedEmail}`);
    } else {
      await client.query(
        `INSERT INTO users (role_id, full_name, email, password_hash) VALUES ($1, $2, $3, $4)`,
        [roleId, ADMIN_NAME, normalizedEmail, passwordHash]
      );
      console.log(`Admin account created: ${normalizedEmail}`);
    }

    console.log('Done. Sign in with the configured admin credentials.');
  } finally {
    await client.end();
  }
};

main().catch((err) => {
  console.error('seed-admin failed:', err.message);
  process.exit(1);
});
