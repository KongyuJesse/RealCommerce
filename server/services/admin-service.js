const { query, withTransaction } = require('../db');
const { assert, asNumber, isEmail, isNonEmptyString, normalizeEmail } = require('../utils/validation');
const { normalizeText, normalizeNullableText, normalizeBoolean, mapMoneyRow } = require('../utils/format');
const { recordAdminActivity } = require('./activity-log-service');
const { assertStrongPassword, hashPassword, splitFullName } = require('./auth-service');

const MANAGED_ROLE_NAMES = ['admin', 'inventory_manager', 'order_manager', 'customer_support', 'marketing_manager', 'finance_manager', 'catalog_manager', 'shipping_coordinator', 'customer'];
const REORDER_STATUSES = ['OPEN', 'ORDERED', 'RECEIVED', 'CANCELLED'];

const normalizeRoleName = (value) => normalizeText(value).toLowerCase();

const getManagedUserById = async (userId, client = { query }) => {
  const result = await client.query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.is_active,
        u.last_login_at,
        u.created_at,
        r.name AS role_name,
        c.id AS customer_id,
        c.company_name,
        c.city,
        c.country,
        c.phone,
        c.lifetime_value,
        ct.name AS tier_name,
        COALESCE((
          SELECT COUNT(*)::integer
          FROM orders o
          WHERE o.customer_id = c.id
        ), 0) AS total_orders
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN customers c ON c.user_id = u.id
      LEFT JOIN customer_tiers ct ON ct.id = c.tier_id
      WHERE u.id = $1
      LIMIT 1
    `,
    [userId]
  );

  return result.rows[0] ? mapMoneyRow(result.rows[0], ['lifetime_value']) : null;
};

const getWarehouseById = async (warehouseId, client = { query }) => {
  const result = await client.query(
    `
      SELECT
        w.id,
        w.code,
        w.name,
        w.city,
        w.country,
        w.capacity_units,
        w.is_active,
        w.created_at,
        COALESCE(SUM(i.quantity_on_hand), 0)::integer AS utilized_units,
        COUNT(DISTINCT i.product_id)::integer AS active_skus,
        COUNT(
          DISTINCT CASE
            WHEN i.quantity_on_hand <= i.reorder_point THEN i.product_id
            ELSE NULL
          END
        )::integer AS alert_skus
      FROM warehouses w
      LEFT JOIN inventory i ON i.warehouse_id = w.id
      WHERE w.id = $1
      GROUP BY w.id
      LIMIT 1
    `,
    [warehouseId]
  );

  if (result.rowCount === 0) {
    return null;
  }

  const warehouse = result.rows[0];
  const utilizationRate = warehouse.capacity_units
    ? Math.round((Number(warehouse.utilized_units || 0) / Number(warehouse.capacity_units || 1)) * 100)
    : 0;

  return {
    ...warehouse,
    utilization_rate: utilizationRate,
    utilizationRate,
    available_capacity: Math.max(0, Number(warehouse.capacity_units || 0) - Number(warehouse.utilized_units || 0)),
    availableCapacity: Math.max(0, Number(warehouse.capacity_units || 0) - Number(warehouse.utilized_units || 0)),
  };
};

const resolveRoleId = async (client, roleName) => {
  const normalizedRoleName = normalizeRoleName(roleName);
  assert(MANAGED_ROLE_NAMES.includes(normalizedRoleName), 'Unsupported role selected.');
  const role = await client.query('SELECT id, name FROM roles WHERE name = $1 LIMIT 1', [normalizedRoleName]);
  assert(role.rowCount > 0, 'Selected role is not configured.', 500);
  return role.rows[0];
};

const resolveStarterTierId = async (client) => {
  const tier = await client.query("SELECT id FROM customer_tiers WHERE LOWER(name) = 'starter' ORDER BY id ASC LIMIT 1");
  assert(tier.rowCount > 0, 'Starter customer tier is not configured.', 500);
  return tier.rows[0].id;
};

const ensureCustomerRecord = async (client, userId, payload) => {
  const email = normalizeEmail(payload.email);
  const fullName = normalizeText(payload.fullName);
  const { firstName, lastName } = splitFullName(fullName);
  const city = normalizeNullableText(payload.city);
  const country = normalizeNullableText(payload.country);
  const phone = normalizeNullableText(payload.phone);
  const companyName = normalizeNullableText(payload.companyName);

  const existing = await client.query('SELECT id FROM customers WHERE user_id = $1 LIMIT 1', [userId]);
  if (existing.rowCount > 0) {
    await client.query(
      `
        UPDATE customers
        SET
          first_name = COALESCE(NULLIF($1, ''), first_name),
          last_name = COALESCE(NULLIF($2, ''), last_name),
          email = COALESCE(NULLIF($3, ''), email),
          city = COALESCE($4, city),
          country = COALESCE($5, country),
          phone = COALESCE($6, phone),
          company_name = COALESCE($7, company_name)
        WHERE user_id = $8
      `,
      [firstName, lastName, email, city, country, phone, companyName, userId]
    );
    return existing.rows[0].id;
  }

  const starterTierId = await resolveStarterTierId(client);
  const inserted = await client.query(
    `
      INSERT INTO customers (user_id, tier_id, company_name, first_name, last_name, email, phone, city, country)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id
    `,
    [userId, starterTierId, companyName, firstName, lastName, email, phone, city, country]
  );

  return inserted.rows[0].id;
};

const listManagedUsers = async ({ search = '', roleName = '', limit = 50 } = {}) => {
  const normalizedSearch = normalizeText(search).toLowerCase();
  const normalizedRoleName = normalizeRoleName(roleName);
  const safeLimit = Math.min(100, Math.max(1, asNumber(limit, 50)));

  const result = await query(
    `
      SELECT
        u.id,
        u.full_name,
        u.email,
        u.is_active,
        u.last_login_at,
        u.created_at,
        r.name AS role_name,
        c.id AS customer_id,
        c.company_name,
        c.city,
        c.country,
        c.phone,
        c.lifetime_value,
        ct.name AS tier_name,
        COALESCE((
          SELECT COUNT(*)::integer
          FROM orders o
          WHERE o.customer_id = c.id
        ), 0) AS total_orders
      FROM users u
      JOIN roles r ON r.id = u.role_id
      LEFT JOIN customers c ON c.user_id = u.id
      LEFT JOIN customer_tiers ct ON ct.id = c.tier_id
      WHERE (
        $1 = ''
        OR LOWER(u.full_name) LIKE CONCAT('%', $1, '%')
        OR LOWER(u.email) LIKE CONCAT('%', $1, '%')
      )
      AND ($2 = '' OR r.name = $2)
      ORDER BY
        CASE WHEN r.name = 'admin' THEN 0 ELSE 1 END,
        u.is_active DESC,
        u.created_at DESC,
        u.id DESC
      LIMIT $3
    `,
    [normalizedSearch, normalizedRoleName, safeLimit]
  );

  return result.rows.map((row) => mapMoneyRow(row, ['lifetime_value']));
};

const createManagedUser = async ({ actor = null, payload = {} } = {}) =>
  withTransaction(async (client) => {
    const fullName = normalizeText(payload.fullName);
    const email = normalizeEmail(payload.email);
    const role = await resolveRoleId(client, payload.roleName || 'customer');

    assert(isNonEmptyString(fullName), 'Full name is required.');
    assert(isEmail(email), 'A valid email address is required.');
    assertStrongPassword(payload.password);

    const existing = await client.query('SELECT 1 FROM users WHERE LOWER(email) = $1 LIMIT 1', [email]);
    assert(existing.rowCount === 0, 'A user with this email already exists.', 409);

    const inserted = await client.query(
      `
        INSERT INTO users (role_id, full_name, email, password_hash, is_active)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING id
      `,
      [role.id, fullName, email, hashPassword(payload.password), normalizeBoolean(payload.isActive, true)]
    );

    if (role.name === 'customer') {
      await ensureCustomerRecord(client, inserted.rows[0].id, {
        ...payload,
        fullName,
        email,
      });
    }

    await recordAdminActivity({
      client,
      actorUserId: actor?.user_id,
      actorRole: actor?.role_name,
      action: 'user.created',
      entityType: 'user',
      entityId: inserted.rows[0].id,
      summary: `Created ${role.name} account for ${fullName}.`,
      metadata: {
        email,
        roleName: role.name,
        isActive: normalizeBoolean(payload.isActive, true),
      },
    });

    return getManagedUserById(inserted.rows[0].id, client);
  });

const updateManagedUser = async ({ actor = null, userId, payload = {} }) =>
  withTransaction(async (client) => {
    const existingUser = await client.query(
      `
        SELECT u.id, u.full_name, u.email, u.is_active, r.name AS role_name
        FROM users u
        JOIN roles r ON r.id = u.role_id
        WHERE u.id = $1
        LIMIT 1
      `,
      [userId]
    );

    assert(existingUser.rowCount > 0, 'User not found.', 404);

    const current = existingUser.rows[0];
    const nextRole = payload.roleName ? await resolveRoleId(client, payload.roleName) : null;
    const fullName = payload.fullName !== undefined ? normalizeText(payload.fullName) : current.full_name;
    const email = payload.email !== undefined ? normalizeEmail(payload.email) : current.email;
    const isActive = payload.isActive !== undefined ? normalizeBoolean(payload.isActive, current.is_active) : current.is_active;

    assert(isNonEmptyString(fullName), 'Full name is required.');
    assert(isEmail(email), 'A valid email address is required.');

    const duplicate = await client.query(
      'SELECT 1 FROM users WHERE LOWER(email) = $1 AND id <> $2 LIMIT 1',
      [email, userId]
    );
    assert(duplicate.rowCount === 0, 'Another user already uses this email.', 409);

    await client.query(
      `
        UPDATE users
        SET
          full_name = $1,
          email = $2,
          is_active = $3,
          role_id = COALESCE($4, role_id)
        WHERE id = $5
      `,
      [fullName, email, isActive, nextRole?.id || null, userId]
    );

    const resolvedRoleName = nextRole?.name || current.role_name;
    if (resolvedRoleName === 'customer') {
      await ensureCustomerRecord(client, userId, {
        ...payload,
        fullName,
        email,
      });
    } else {
      await client.query('UPDATE customers SET email = $1 WHERE user_id = $2', [email, userId]);
    }

    if (!isActive) {
      await client.query('DELETE FROM user_sessions WHERE user_id = $1', [userId]);
    }

    await recordAdminActivity({
      client,
      actorUserId: actor?.user_id,
      actorRole: actor?.role_name,
      action: 'user.updated',
      entityType: 'user',
      entityId: userId,
      summary: `Updated ${resolvedRoleName} account for ${fullName}.`,
      metadata: {
        email,
        roleName: resolvedRoleName,
        isActive,
      },
    });

    return getManagedUserById(userId, client);
  });

const listWarehouses = async () => {
  const result = await query(
    `
      SELECT
        w.id,
        w.code,
        w.name,
        w.city,
        w.country,
        w.capacity_units,
        w.is_active,
        w.created_at,
        COALESCE(SUM(i.quantity_on_hand), 0)::integer AS utilized_units,
        COUNT(DISTINCT i.product_id)::integer AS active_skus,
        COUNT(
          DISTINCT CASE
            WHEN i.quantity_on_hand <= i.reorder_point THEN i.product_id
            ELSE NULL
          END
        )::integer AS alert_skus
      FROM warehouses w
      LEFT JOIN inventory i ON i.warehouse_id = w.id
      GROUP BY w.id
      ORDER BY w.is_active DESC, w.name ASC
    `
  );

  return result.rows.map((warehouse) => ({
    ...warehouse,
    utilization_rate: warehouse.capacity_units
      ? Math.round((Number(warehouse.utilized_units || 0) / Number(warehouse.capacity_units || 1)) * 100)
      : 0,
    utilizationRate: warehouse.capacity_units
      ? Math.round((Number(warehouse.utilized_units || 0) / Number(warehouse.capacity_units || 1)) * 100)
      : 0,
    available_capacity: Math.max(0, Number(warehouse.capacity_units || 0) - Number(warehouse.utilized_units || 0)),
    availableCapacity: Math.max(0, Number(warehouse.capacity_units || 0) - Number(warehouse.utilized_units || 0)),
  }));
};

const createWarehouse = async ({ actor = null, payload = {} } = {}) =>
  withTransaction(async (client) => {
    const code = normalizeText(payload.code).toUpperCase();
    const name = normalizeText(payload.name);
    const city = normalizeText(payload.city);
    const country = normalizeText(payload.country);
    const capacityUnits = asNumber(payload.capacityUnits, NaN);

    assert(isNonEmptyString(code), 'Warehouse code is required.');
    assert(isNonEmptyString(name), 'Warehouse name is required.');
    assert(isNonEmptyString(city), 'Warehouse city is required.');
    assert(isNonEmptyString(country), 'Warehouse country is required.');
    assert(Number.isInteger(capacityUnits) && capacityUnits > 0, 'capacityUnits must be a positive whole number.');

    const inserted = await client.query(
      `
        INSERT INTO warehouses (code, name, city, country, capacity_units, is_active)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING id
      `,
      [code, name, city, country, capacityUnits, normalizeBoolean(payload.isActive, true)]
    );

    const warehouse = await getWarehouseById(inserted.rows[0].id, client);

    await recordAdminActivity({
      client,
      actorUserId: actor?.user_id,
      actorRole: actor?.role_name,
      action: 'warehouse.created',
      entityType: 'warehouse',
      entityId: inserted.rows[0].id,
      summary: `Created warehouse ${name} (${code}).`,
      metadata: {
        city,
        country,
        capacityUnits,
        isActive: normalizeBoolean(payload.isActive, true),
      },
    });

    return warehouse;
  });

const updateWarehouse = async ({ actor = null, warehouseId, payload = {} }) =>
  withTransaction(async (client) => {
    const existing = await client.query('SELECT id FROM warehouses WHERE id = $1 LIMIT 1', [warehouseId]);
    assert(existing.rowCount > 0, 'Warehouse not found.', 404);

    const updates = [];
    const values = [];
    const apply = (column, value) => {
      values.push(value);
      updates.push(`${column} = $${values.length}`);
    };

    if (payload.code !== undefined) {
      const code = normalizeText(payload.code).toUpperCase();
      assert(isNonEmptyString(code), 'Warehouse code cannot be empty.');
      apply('code', code);
    }

    if (payload.name !== undefined) {
      const name = normalizeText(payload.name);
      assert(isNonEmptyString(name), 'Warehouse name cannot be empty.');
      apply('name', name);
    }

    if (payload.city !== undefined) {
      const city = normalizeText(payload.city);
      assert(isNonEmptyString(city), 'Warehouse city cannot be empty.');
      apply('city', city);
    }

    if (payload.country !== undefined) {
      const country = normalizeText(payload.country);
      assert(isNonEmptyString(country), 'Warehouse country cannot be empty.');
      apply('country', country);
    }

    if (payload.capacityUnits !== undefined) {
      const capacityUnits = asNumber(payload.capacityUnits, NaN);
      assert(Number.isInteger(capacityUnits) && capacityUnits > 0, 'capacityUnits must be a positive whole number.');
      apply('capacity_units', capacityUnits);
    }

    if (payload.isActive !== undefined) {
      apply('is_active', normalizeBoolean(payload.isActive, true));
    }

    assert(updates.length > 0, 'At least one warehouse field is required.');
    values.push(warehouseId);

    await client.query(
      `
        UPDATE warehouses
        SET ${updates.join(', ')}
        WHERE id = $${values.length}
      `,
      values
    );

    const warehouse = await getWarehouseById(warehouseId, client);

    await recordAdminActivity({
      client,
      actorUserId: actor?.user_id,
      actorRole: actor?.role_name,
      action: 'warehouse.updated',
      entityType: 'warehouse',
      entityId: warehouseId,
      summary: `Updated warehouse ${warehouse?.name || warehouseId}.`,
      metadata: {
        updatedFields: Object.keys(payload || {}),
      },
    });

    return warehouse;
  });

const createManualReorderRequest = async ({ actor = null, payload = {} } = {}) =>
  withTransaction(async (client) => {
    const productId = asNumber(payload.productId, NaN);
    const warehouseId = asNumber(payload.warehouseId, NaN);
    const manualQuantityRequested = payload.quantityRequested === undefined
      ? NaN
      : asNumber(payload.quantityRequested, NaN);

    assert(Number.isInteger(productId) && productId > 0, 'productId is required.');
    assert(Number.isInteger(warehouseId) && warehouseId > 0, 'warehouseId is required.');

    const inventory = await client.query(
      `
        SELECT
          i.product_id,
          i.warehouse_id,
          i.quantity_on_hand,
          i.reorder_point,
          i.safety_stock,
          p.name AS product_name,
          w.name AS warehouse_name
        FROM inventory i
        JOIN products p ON p.id = i.product_id
        JOIN warehouses w ON w.id = i.warehouse_id
        WHERE i.product_id = $1
          AND i.warehouse_id = $2
        LIMIT 1
      `,
      [productId, warehouseId]
    );

    assert(inventory.rowCount > 0, 'Inventory position not found for this product and warehouse.', 404);

    const position = inventory.rows[0];
    const quantityRequested = Number.isInteger(manualQuantityRequested) && manualQuantityRequested > 0
      ? manualQuantityRequested
      : Math.max((Number(position.reorder_point) + Number(position.safety_stock || 0)) - Number(position.quantity_on_hand), 1);

    const existing = await client.query(
      `
        SELECT id
        FROM reorder_requests
        WHERE product_id = $1
          AND warehouse_id = $2
          AND status = 'OPEN'
        LIMIT 1
      `,
      [productId, warehouseId]
    );

    if (existing.rowCount > 0) {
      return client.query(
        `
          SELECT
            rr.id,
            rr.product_id,
            rr.warehouse_id,
            rr.quantity_requested,
            rr.quantity_on_hand,
            rr.reorder_point,
            rr.status,
            rr.trigger_source,
            rr.note,
            rr.created_at,
            p.name AS product_name,
            w.name AS warehouse_name
          FROM reorder_requests rr
          JOIN products p ON p.id = rr.product_id
          JOIN warehouses w ON w.id = rr.warehouse_id
          WHERE rr.id = $1
          LIMIT 1
        `,
        [existing.rows[0].id]
      ).then(async (result) => {
        await recordAdminActivity({
          client,
          actorUserId: actor?.user_id,
          actorRole: actor?.role_name,
          action: 'reorder.request.reused',
          entityType: 'reorder_request',
          entityId: existing.rows[0].id,
          summary: `Reused existing reorder request for ${position.product_name} at ${position.warehouse_name}.`,
          metadata: {
            productId,
            warehouseId,
          },
        });
        return result.rows[0];
      });
    }

    const inserted = await client.query(
      `
        INSERT INTO reorder_requests (
          product_id,
          warehouse_id,
          quantity_requested,
          quantity_on_hand,
          reorder_point,
          status,
          trigger_source,
          note
        )
        VALUES ($1, $2, $3, $4, $5, 'OPEN', 'MANUAL_REQUEST', $6)
        RETURNING id
      `,
      [
        productId,
        warehouseId,
        quantityRequested,
        position.quantity_on_hand,
        position.reorder_point,
        normalizeNullableText(payload.note) || 'Manually requested from the operations workspace.',
      ]
    );

    return client.query(
      `
        SELECT
          rr.id,
          rr.product_id,
          rr.warehouse_id,
          rr.quantity_requested,
          rr.quantity_on_hand,
          rr.reorder_point,
          rr.status,
          rr.trigger_source,
          rr.note,
          rr.created_at,
          p.name AS product_name,
          w.name AS warehouse_name
        FROM reorder_requests rr
        JOIN products p ON p.id = rr.product_id
        JOIN warehouses w ON w.id = rr.warehouse_id
        WHERE rr.id = $1
        LIMIT 1
      `,
      [inserted.rows[0].id]
    ).then(async (result) => {
      await recordAdminActivity({
        client,
        actorUserId: actor?.user_id,
        actorRole: actor?.role_name,
        action: 'reorder.request.created',
        entityType: 'reorder_request',
        entityId: inserted.rows[0].id,
        summary: `Created reorder request for ${position.product_name} at ${position.warehouse_name}.`,
        metadata: {
          productId,
          warehouseId,
          quantityRequested,
        },
      });
      return result.rows[0];
    });
  });

const updateReorderRequestStatus = async ({ actor = null, requestId, payload = {} }) =>
  withTransaction(async (client) => {
  const normalizedStatus = normalizeText(payload.status).toUpperCase();
  assert(REORDER_STATUSES.includes(normalizedStatus), 'Unsupported reorder request status.');

  const result = await client.query(
    `
      UPDATE reorder_requests
      SET
        status = $1,
        note = COALESCE($2, note),
        resolved_at = CASE WHEN $1 IN ('RECEIVED', 'CANCELLED') THEN NOW() ELSE NULL END
      WHERE id = $3
      RETURNING id, product_id, warehouse_id, quantity_requested, quantity_on_hand, reorder_point, status, trigger_source, note, created_at, resolved_at
    `,
    [normalizedStatus, normalizeNullableText(payload.note), requestId]
  );

  assert(result.rowCount > 0, 'Reorder request not found.', 404);
  await recordAdminActivity({
    client,
    actorUserId: actor?.user_id,
    actorRole: actor?.role_name,
    action: 'reorder.request.updated',
    entityType: 'reorder_request',
    entityId: requestId,
    summary: `Moved reorder request ${requestId} to ${normalizedStatus}.`,
    metadata: {
      status: normalizedStatus,
      note: normalizeNullableText(payload.note),
    },
  });
  return result.rows[0];
});

module.exports = {
  createManagedUser,
  createManualReorderRequest,
  createWarehouse,
  listManagedUsers,
  listWarehouses,
  updateManagedUser,
  updateReorderRequestStatus,
  updateWarehouse,
};
