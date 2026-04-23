const crypto = require('crypto');
const config = require('../config');
const { query, withTransaction } = require('../db');
const { assert, isEmail, isNonEmptyString, normalizeEmail } = require('../utils/validation');
const { sendWelcomeEmail, sendPasswordResetEmail } = require('./email-service');

const slugify = (value) =>
  String(value || '')
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 120);

const splitFullName = (value) => {
  const trimmedValue = String(value || '').trim().replace(/\s+/g, ' ');
  if (!trimmedValue) {
    return { firstName: '', lastName: '' };
  }

  const [firstName, ...rest] = trimmedValue.split(' ');
  return {
    firstName,
    lastName: rest.join(' ') || firstName,
  };
};

const assertStrongPassword = (password) => {
  assert(isNonEmptyString(password) && password.length >= 10, 'Password must be at least 10 characters.');
  assert(
    /[A-Z]/.test(password) &&
      /[a-z]/.test(password) &&
      /\d/.test(password) &&
      /[^A-Za-z0-9]/.test(password),
    'Password must include uppercase, lowercase, a number, and a special character.'
  );
};

const generateUniqueSellerSlug = async (client, baseValue) => {
  const baseSlug = slugify(baseValue) || `seller-${Date.now()}`;
  let candidate = baseSlug;
  let counter = 1;

  while (true) {
    const existing = await client.query('SELECT 1 FROM seller_profiles WHERE slug = $1 LIMIT 1', [candidate]);
    if (existing.rowCount === 0) {
      return candidate;
    }
    counter += 1;
    candidate = `${baseSlug}-${counter}`;
  }
};

const hashPassword = (password, salt = crypto.randomBytes(16).toString('hex')) =>
  `scrypt$${salt}$${crypto.scryptSync(password, salt, 64).toString('hex')}`;

const verifyPassword = (password, storedHash) => {
  const [scheme, salt, digest] = String(storedHash || '').split('$');

  if (scheme !== 'scrypt' || !salt || !digest) {
    return false;
  }

  const candidate = crypto.scryptSync(password, salt, 64).toString('hex');
  const candidateBuffer = Buffer.from(candidate, 'hex');
  const digestBuffer = Buffer.from(digest, 'hex');

  if (candidateBuffer.length !== digestBuffer.length) {
    return false;
  }

  return crypto.timingSafeEqual(candidateBuffer, digestBuffer);
};

const hashSessionToken = (token) =>
  crypto.createHash('sha256').update(`${config.sessionSecret}:${token}`).digest('hex');

const getSessionUserByHash = async (tokenHash) => {
  const result = await query(
    `
      SELECT
        us.id AS session_id,
        us.expires_at,
        u.id AS user_id,
        u.full_name,
        u.email,
        u.is_active,
        r.name AS role_name,
        c.id AS customer_id,
        c.first_name,
        c.last_name,
        c.city,
        c.country,
        ct.name AS tier_name,
        ct.discount_rate
      FROM user_sessions us
      JOIN users u ON u.id = us.user_id
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN customers c ON c.user_id = u.id AND r.name = 'customer'
      LEFT JOIN customer_tiers ct ON ct.id = c.tier_id
      WHERE us.session_token_hash = $1 AND us.expires_at > NOW()
      LIMIT 1
    `,
    [tokenHash]
  );

  return result.rows[0] || null;
};

const registerUser = async (payload) => {
  const email = normalizeEmail(payload.email);
  const requestedAccountType = String(payload.accountType || 'customer').trim().toLowerCase();
  const accountType = requestedAccountType === 'buyer' ? 'customer' : requestedAccountType;
  const normalizedFullName = String(payload.fullName || '').trim().replace(/\s+/g, ' ');
  const derivedName = splitFullName(normalizedFullName);
  const firstName = String(payload.firstName || derivedName.firstName).trim();
  const lastName = String(payload.lastName || derivedName.lastName).trim();

  assert(isNonEmptyString(normalizedFullName), 'Full name is required.');
  assert(isEmail(email), 'A valid email is required.');
  assertStrongPassword(payload.password);
  assert(isNonEmptyString(firstName), 'First name is required.');
  assert(isNonEmptyString(lastName), 'Last name is required.');
  assert(accountType === 'customer', 'Only customer self-service registration is available.');

  return withTransaction(async (client) => {
    const existing = await client.query('SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
    assert(existing.rowCount === 0, 'An account with this email already exists.', 409);

    const role = await client.query('SELECT id FROM roles WHERE name = $1 LIMIT 1', [accountType]);
    assert(role.rowCount > 0, 'This account type is not configured yet.', 500);
    const userInsert = await client.query(
      `
        INSERT INTO users (role_id, full_name, email, password_hash)
        VALUES ($1, $2, $3, $4)
        RETURNING id, email, full_name
      `,
      [role.rows[0].id, normalizedFullName, email, hashPassword(payload.password)]
    );

    if (accountType === 'customer') {
      const tier = await client.query("SELECT id FROM customer_tiers WHERE name = 'Starter' LIMIT 1");
      assert(tier.rowCount > 0, 'Default customer tier is not configured yet.', 500);
      await client.query(
        `
          INSERT INTO customers (user_id, tier_id, company_name, first_name, last_name, email, phone, city, country)
          VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
        `,
        [
          userInsert.rows[0].id,
          tier.rows[0].id,
          payload.companyName || null,
          firstName,
          lastName,
          email,
          payload.phone || null,
          payload.city || null,
          payload.country || null,
        ]
      );
    }

    const result = {
      ...userInsert.rows[0],
      accountType,
    };

    // Fire-and-forget welcome email — never block registration on email failure
    sendWelcomeEmail({ to: email, fullName: normalizedFullName }).catch(() => {});

    return result;
  });
};

const loginUser = async ({ email, password, userAgent, ipAddress }) => {
  const normalizedEmail = normalizeEmail(email);
  assert(isEmail(normalizedEmail), 'A valid email is required.');
  assert(isNonEmptyString(password), 'Password is required.');

  const result = await query(
    `
      SELECT u.id, u.password_hash
      FROM users u
      WHERE LOWER(u.email) = $1 AND u.is_active = TRUE
      LIMIT 1
    `,
    [normalizedEmail]
  );

  assert(result.rowCount > 0 && verifyPassword(password, result.rows[0].password_hash), 'Invalid email or password.', 401);

  const sessionToken = crypto.randomBytes(32).toString('hex');
  const sessionHash = hashSessionToken(sessionToken);
  const expiresAt = new Date(Date.now() + config.sessionTtlDays * 24 * 60 * 60 * 1000);

  await query('DELETE FROM user_sessions WHERE user_id = $1 AND expires_at <= NOW()', [result.rows[0].id]);
  await query(
    `
      INSERT INTO user_sessions (user_id, session_token_hash, user_agent, ip_address, expires_at)
      VALUES ($1, $2, $3, $4, $5)
    `,
    [result.rows[0].id, sessionHash, userAgent || '', ipAddress || '', expiresAt]
  );
  await query('UPDATE users SET last_login_at = NOW() WHERE id = $1', [result.rows[0].id]);

  return {
    sessionToken,
    sessionUser: await getSessionUserByHash(sessionHash),
  };
};

const logoutUser = async (sessionToken) => {
  if (!sessionToken) {
    return;
  }

  await query('DELETE FROM user_sessions WHERE session_token_hash = $1', [hashSessionToken(sessionToken)]);
};

const loadCurrentUser = async (sessionToken) => {
  if (!sessionToken) {
    return null;
  }

  const user = await getSessionUserByHash(hashSessionToken(sessionToken));

  if (user?.session_id) {
    await query('UPDATE user_sessions SET last_seen_at = NOW() WHERE id = $1', [user.session_id]);
  }

  return user;
};

const changePassword = async ({ userId, currentPassword, newPassword }) => {
  assert(isNonEmptyString(currentPassword), 'Current password is required.');
  assertStrongPassword(newPassword);

  const result = await query('SELECT password_hash FROM users WHERE id = $1 AND is_active = TRUE LIMIT 1', [userId]);
  assert(result.rowCount > 0, 'User not found.', 404);
  assert(verifyPassword(currentPassword, result.rows[0].password_hash), 'Current password is incorrect.', 401);

  await query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(newPassword), userId]);
  // Invalidate all sessions so the user must re-login on all devices
  await query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
};

const requestPasswordReset = async ({ email }) => {
  const normalizedEmail = normalizeEmail(email);
  assert(isEmail(normalizedEmail), 'A valid email is required.');

  // Always respond with success to prevent email enumeration
  const user = await query(
    'SELECT id, full_name FROM users WHERE LOWER(email) = $1 AND is_active = TRUE LIMIT 1',
    [normalizedEmail]
  );

  if (user.rowCount === 0) return { success: true };

  const { id: userId, full_name: fullName } = user.rows[0];

  // Invalidate any existing unused tokens for this user
  await query('UPDATE password_reset_tokens SET used_at = NOW() WHERE user_id = $1 AND used_at IS NULL', [userId]);

  const rawToken = crypto.randomBytes(32).toString('hex');
  const tokenHash = crypto.createHash('sha256').update(rawToken).digest('hex');
  const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

  await query(
    'INSERT INTO password_reset_tokens (user_id, token_hash, expires_at) VALUES ($1, $2, $3)',
    [userId, tokenHash, expiresAt]
  );

  const clientOrigin = process.env.CLIENT_ORIGIN || 'http://localhost:3000';
  const resetUrl = `${clientOrigin}/#/reset-password/${rawToken}`;

  sendPasswordResetEmail({ to: normalizedEmail, fullName, resetUrl }).catch(() => {});

  return { success: true };
};

const confirmPasswordReset = async ({ token, newPassword }) => {
  assert(isNonEmptyString(token), 'Reset token is required.');
  assertStrongPassword(newPassword);

  const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
  const result = await query(
    `SELECT id, user_id FROM password_reset_tokens
     WHERE token_hash = $1 AND used_at IS NULL AND expires_at > NOW()
     LIMIT 1`,
    [tokenHash]
  );

  assert(result.rowCount > 0, 'This reset link is invalid or has expired.', 400);

  const { id: tokenId, user_id: userId } = result.rows[0];

  await withTransaction(async (client) => {
    await client.query('UPDATE users SET password_hash = $1 WHERE id = $2', [hashPassword(newPassword), userId]);
    await client.query('UPDATE password_reset_tokens SET used_at = NOW() WHERE id = $1', [tokenId]);
    await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
  });

  return { success: true };
};

module.exports = {
  assertStrongPassword,
  changePassword,
  confirmPasswordReset,
  hashPassword,
  loginUser,
  logoutUser,
  loadCurrentUser,
  registerUser,
  requestPasswordReset,
  splitFullName,
};
