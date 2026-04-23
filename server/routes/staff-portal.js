/**
 * Staff Portal — Secret internal route
 * Mounted at /api/x7k9m (non-obvious path, not documented in public API)
 * All routes require staff authentication (non-customer roles only)
 */
const express = require('express');
const config  = require('../config');
const { pool } = require('../db');
const { createAuthRateLimit } = require('../middleware/auth-rate-limit');
const { loginUser, logoutUser, loadCurrentUser } = require('../services/auth-service');
const {
  getAdminDashboard,
  getOperationsDashboard,
  getCustomerProfile,
  listShipments,
  updateOrderStatus,
  updateShipmentStatus,
  createShipmentEvent,
  createProduct,
  updatePlatformSettings,
  listProducts,
} = require('../services/commerce-service');
const {
  listManagedUsers,
  createManagedUser,
  updateManagedUser,
  listWarehouses,
  createWarehouse,
  updateWarehouse,
  createManualReorderRequest,
  updateReorderRequestStatus,
} = require('../services/admin-service');
const {
  getFullAnalyticsBundle,
  getInventoryHealth,
  getWeeklyCategorySales,
  getTopProductsByCategory,
  getCustomerTierMatrix,
  getPriceHistory,
  getExchangeRateDashboard,
} = require('../services/analytics-service');
const { listAdminActivity, recordAdminActivity } = require('../services/activity-log-service');
const { getExchangeRateSyncStatus, syncExchangeRates } = require('../services/exchange-rate-sync-service');
const { buildCookieHeader, wrap } = require('../utils/http');
const { query } = require('../db');

const STAFF_ROLES = [
  'admin', 'inventory_manager', 'order_manager', 'customer_support',
  'marketing_manager', 'finance_manager', 'catalog_manager', 'shipping_coordinator',
];

const ROLE_CAPABILITIES = {
  admin: {
    canViewAnalytics: true, canManageCatalog: true, canManageOperations: true,
    canManagePeople: true, canManageWarehouses: true, canManageExchangeRates: true,
    canViewSupport: true, canManageFinance: true,
  },
  inventory_manager: {
    canViewAnalytics: true, canManageWarehouses: true, canManageOperations: false,
    canManageCatalog: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: false, canManageFinance: false,
  },
  order_manager: {
    canViewAnalytics: true, canManageOperations: true, canManageWarehouses: false,
    canManageCatalog: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: true, canManageFinance: false,
  },
  customer_support: {
    canViewAnalytics: false, canManageOperations: false, canManageWarehouses: false,
    canManageCatalog: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: true, canManageFinance: false,
  },
  marketing_manager: {
    canViewAnalytics: true, canManageCatalog: true, canManageOperations: false,
    canManageWarehouses: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: false, canManageFinance: false,
  },
  finance_manager: {
    canViewAnalytics: true, canManageCatalog: false, canManageOperations: false,
    canManageWarehouses: false, canManagePeople: false, canManageExchangeRates: true,
    canViewSupport: false, canManageFinance: true,
  },
  catalog_manager: {
    canViewAnalytics: true, canManageCatalog: true, canManageOperations: false,
    canManageWarehouses: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: false, canManageFinance: false,
  },
  shipping_coordinator: {
    canViewAnalytics: false, canManageOperations: true, canManageWarehouses: false,
    canManageCatalog: false, canManagePeople: false, canManageExchangeRates: false,
    canViewSupport: false, canManageFinance: false,
  },
};

const ROLE_LABELS = {
  admin:               'Administrator',
  inventory_manager:   'Inventory Manager',
  order_manager:       'Order Manager',
  customer_support:    'Customer Support',
  marketing_manager:   'Marketing Manager',
  finance_manager:     'Finance Manager',
  catalog_manager:     'Catalog Manager',
  shipping_coordinator:'Shipping Coordinator',
};

const createStaffPortalRouter = ({ loadSessionUser, clearSessionCookieHeader }) => {
  const router = express.Router();

  const loginRateLimit = createAuthRateLimit({
    bucketName: 'staff-portal-login',
    maxAttempts: 5,
    windowMs: config.authRateLimitWindowMs,
  });

  /* ── Auth guard: staff only ── */
  const requireStaff = (roles = STAFF_ROLES) => (req, res, next) => {
    if (!req.currentUser) {
      return res.status(401).json({ error: 'AUTH_REQUIRED', message: 'Staff authentication required.' });
    }
    if (!STAFF_ROLES.includes(req.currentUser.role_name)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Staff access only.' });
    }
    if (roles.length > 0 && !roles.includes(req.currentUser.role_name)) {
      return res.status(403).json({ error: 'FORBIDDEN', message: 'Insufficient role for this action.' });
    }
    next();
  };

  /* ════════════════════════════════════════════════════
     AUTH
     ════════════════════════════════════════════════════ */

  /* POST /api/x7k9m/auth/login — staff login */
  router.post('/auth/login', loginRateLimit, wrap(async (req, res) => {
    const { sessionToken, sessionUser } = await loginUser({
      email:     req.body?.email,
      password:  req.body?.password,
      userAgent: req.headers['user-agent'],
      ipAddress: req.ip,
    });

    if (!STAFF_ROLES.includes(sessionUser?.role_name)) {
      await logoutUser(sessionToken);
      return res.status(403).json({
        error: 'FORBIDDEN',
        message: 'This portal is for staff accounts only.',
      });
    }

    res.setHeader('Set-Cookie', buildCookieHeader({
      name:          config.sessionCookieName,
      value:         sessionToken,
      secure:        config.sessionCookieSecure,
      maxAgeSeconds: config.sessionTtlDays * 24 * 60 * 60,
      sameSite:      config.sessionCookieSameSite,
      domain:        config.sessionCookieDomain,
    }));

    const caps = ROLE_CAPABILITIES[sessionUser.role_name] || {};
    res.json({
      success: true,
      staff: {
        userId:    sessionUser.user_id,
        fullName:  sessionUser.full_name,
        email:     sessionUser.email,
        roleName:  sessionUser.role_name,
        roleLabel: ROLE_LABELS[sessionUser.role_name] || sessionUser.role_name,
        capabilities: caps,
      },
    });
  }));

  /* POST /api/x7k9m/auth/logout */
  router.post('/auth/logout', wrap(async (req, res) => {
    await logoutUser(req.sessionToken);
    res.setHeader('Set-Cookie', clearSessionCookieHeader);
    res.json({ success: true });
  }));

  /* GET /api/x7k9m/auth/session */
  router.get('/auth/session', requireStaff(), wrap(async (req, res) => {
    const u    = req.currentUser;
    const caps = ROLE_CAPABILITIES[u.role_name] || {};
    res.json({
      userId:    u.user_id,
      fullName:  u.full_name,
      email:     u.email,
      roleName:  u.role_name,
      roleLabel: ROLE_LABELS[u.role_name] || u.role_name,
      capabilities: caps,
    });
  }));

  /* ════════════════════════════════════════════════════
     DASHBOARD — role-specific data in one call
     ════════════════════════════════════════════════════ */

  router.get('/dashboard', requireStaff(), wrap(async (req, res) => {
    const role = req.currentUser.role_name;
    const caps = ROLE_CAPABILITIES[role] || {};
    const payload = { role, roleLabel: ROLE_LABELS[role], capabilities: caps };

    if (role === 'admin') {
      const [admin, ops, activity] = await Promise.all([
        getAdminDashboard(),
        getOperationsDashboard(),
        listAdminActivity({ limit: 20 }),
      ]);
      payload.admin = admin.overview;
      payload.ops = ops.overview;
      payload.activity = activity;
      payload.recentOrders = admin.recentOrders || [];
      payload.lowStock = admin.lowStock || [];
    } else if (role === 'inventory_manager') {
      const [warehouses, inventory, ops, activity] = await Promise.all([
        listWarehouses(),
        getInventoryHealth(),
        getOperationsDashboard(),
        listAdminActivity({ limit: 10, entityType: 'warehouse' }),
      ]);
      payload.warehouses = warehouses;
      payload.inventory = inventory;
      payload.reorderQueue = ops.reorderQueue || [];
      payload.activity = activity;
    } else if (role === 'order_manager') {
      const [ops, activity] = await Promise.all([
        getOperationsDashboard(),
        listAdminActivity({ limit: 10, entityType: 'order' }),
      ]);
      payload.ops = ops.overview;
      payload.shipments = ops.shipments || [];
      payload.reorderQueue = ops.reorderQueue || [];
      payload.activity = activity;
    } else if (role === 'shipping_coordinator') {
      const [shipments, activity] = await Promise.all([
        listShipments({ limit: 20 }),
        listAdminActivity({ limit: 10, entityType: 'shipment' }),
      ]);
      payload.shipments = shipments;
      payload.activity = activity;
      payload.ops = { activeShipments: shipments.length };
    } else if (role === 'catalog_manager' || role === 'marketing_manager') {
      const [admin, activity] = await Promise.all([
        getAdminDashboard(),
        listAdminActivity({ limit: 10, entityType: 'product' }),
      ]);
      payload.admin = admin.overview;
      payload.activity = activity;
    } else if (role === 'finance_manager') {
      const [analytics, exchangeRates, syncStatus] = await Promise.all([
        getFullAnalyticsBundle(),
        getExchangeRateDashboard(),
        getExchangeRateSyncStatus(),
      ]);
      payload.analytics = {
        totalRevenue: analytics.totalRevenue || 0,
        avgOrderValue: analytics.avgOrderValue || 0,
        orderCount: analytics.orderCount || 0,
      };
      payload.exchangeRates = exchangeRates.rates || [];
      payload.syncStatus = syncStatus;
    } else if (role === 'customer_support') {
      const [users, recentOrders, activity] = await Promise.all([
        listManagedUsers({ roleName: 'customer', limit: 20 }),
        query(`SELECT o.order_number, o.order_status, o.total_amount, o.currency_code, o.placed_at,
                      CONCAT(c.first_name,' ',c.last_name) AS customer_name
               FROM orders o JOIN customers c ON c.id = o.customer_id
               ORDER BY o.placed_at DESC LIMIT 15`),
        listAdminActivity({ limit: 10 }),
      ]);
      payload.customers = users;
      payload.recentOrders = recentOrders.rows;
      payload.activity = activity;
    }

    res.json(payload);
  }));

  /* ════════════════════════════════════════════════════
     ANALYTICS
     ════════════════════════════════════════════════════ */

  router.get('/analytics', requireStaff(['admin', 'inventory_manager', 'order_manager', 'marketing_manager', 'finance_manager', 'catalog_manager']), wrap(async (_req, res) => {
    res.json(await getFullAnalyticsBundle());
  }));

  router.get('/analytics/inventory', requireStaff(['admin', 'inventory_manager']), wrap(async (_req, res) => {
    res.json(await getInventoryHealth());
  }));

  router.get('/analytics/sales', requireStaff(['admin', 'finance_manager', 'marketing_manager']), wrap(async (req, res) => {
    const weeks = Math.min(52, Math.max(1, parseInt(req.query.weeks || '12', 10)));
    res.json(await getWeeklyCategorySales({ weeksBack: weeks }));
  }));

  router.get('/analytics/products', requireStaff(['admin', 'catalog_manager', 'marketing_manager']), wrap(async (req, res) => {
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit || '30', 10)));
    res.json(await getTopProductsByCategory({ limit }));
  }));

  router.get('/analytics/customers', requireStaff(['admin', 'finance_manager', 'customer_support']), wrap(async (_req, res) => {
    res.json(await getCustomerTierMatrix());
  }));

  router.get('/analytics/prices', requireStaff(['admin', 'finance_manager', 'catalog_manager']), wrap(async (req, res) => {
    const productId = req.query.productId ? parseInt(req.query.productId, 10) : null;
    res.json(await getPriceHistory({ productId }));
  }));

  router.get('/analytics/exchange-rates', requireStaff(['admin', 'finance_manager']), wrap(async (_req, res) => {
    res.json(await getExchangeRateDashboard());
  }));

  /* ════════════════════════════════════════════════════
     ORDERS
     ════════════════════════════════════════════════════ */

  router.get('/orders', requireStaff(['admin', 'order_manager', 'shipping_coordinator', 'customer_support']), wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT o.id, o.order_number, o.order_status, o.total_amount, o.currency_code,
              o.placed_at, o.delivery_eta, o.shipping_method, o.payment_method,
              CONCAT(c.first_name,' ',c.last_name) AS customer_name, c.email AS customer_email
       FROM orders o JOIN customers c ON c.id = o.customer_id
       ORDER BY o.placed_at DESC LIMIT $1 OFFSET $2`,
      [
        Math.min(100, parseInt(req.query.limit || '50', 10)),
        Math.max(0, parseInt(req.query.offset || '0', 10)),
      ]
    );
    res.json(rows);
  }));

  router.patch('/orders/:orderId/status', requireStaff(['admin', 'order_manager', 'shipping_coordinator']), wrap(async (req, res) => {
    await updateOrderStatus({
      orderId:     req.params.orderId,
      status:      req.body?.status,
      actorUserId: req.currentUser.user_id,
      actorRole:   req.currentUser.role_name,
      note:        req.body?.note,
    });
    res.json({ success: true });
  }));

  /* ════════════════════════════════════════════════════
     SHIPMENTS
     ════════════════════════════════════════════════════ */

  router.get('/shipments', requireStaff(['admin', 'order_manager', 'shipping_coordinator']), wrap(async (req, res) => {
    res.json(await listShipments(req.query || {}));
  }));

  router.patch('/shipments/:shipmentId/status', requireStaff(['admin', 'shipping_coordinator', 'order_manager']), wrap(async (req, res) => {
    await updateShipmentStatus({
      shipmentId:  req.params.shipmentId,
      status:      req.body?.status,
      location:    req.body?.location,
      note:        req.body?.note,
      actorUserId: req.currentUser.user_id,
      actorRole:   req.currentUser.role_name,
    });
    res.json({ success: true });
  }));

  router.post('/shipments/:shipmentId/events', requireStaff(['admin', 'shipping_coordinator', 'order_manager']), wrap(async (req, res) => {
    res.status(201).json(await createShipmentEvent({
      shipmentId:  req.params.shipmentId,
      payload:     req.body || {},
      actorUserId: req.currentUser.user_id,
      actorRole:   req.currentUser.role_name,
    }));
  }));

  /* ════════════════════════════════════════════════════
     WAREHOUSES & INVENTORY
     ════════════════════════════════════════════════════ */

  router.get('/warehouses', requireStaff(['admin', 'inventory_manager']), wrap(async (_req, res) => {
    res.json(await listWarehouses());
  }));

  router.post('/warehouses', requireStaff(['admin', 'inventory_manager']), wrap(async (req, res) => {
    res.status(201).json(await createWarehouse({ actor: req.currentUser, payload: req.body || {} }));
  }));

  router.patch('/warehouses/:warehouseId', requireStaff(['admin', 'inventory_manager']), wrap(async (req, res) => {
    res.json(await updateWarehouse({ actor: req.currentUser, warehouseId: req.params.warehouseId, payload: req.body || {} }));
  }));

  router.post('/reorder-requests', requireStaff(['admin', 'inventory_manager']), wrap(async (req, res) => {
    res.status(201).json(await createManualReorderRequest({ actor: req.currentUser, payload: req.body || {} }));
  }));

  router.patch('/reorder-requests/:requestId/status', requireStaff(['admin', 'inventory_manager']), wrap(async (req, res) => {
    res.json(await updateReorderRequestStatus({ actor: req.currentUser, requestId: req.params.requestId, payload: req.body || {} }));
  }));

  /* ════════════════════════════════════════════════════
     CATALOG
     ════════════════════════════════════════════════════ */

  router.get('/products', requireStaff(['admin', 'catalog_manager', 'marketing_manager', 'inventory_manager']), wrap(async (req, res) => {
    res.json(await listProducts(req.query || {}));
  }));

  router.post('/products', requireStaff(['admin', 'catalog_manager', 'marketing_manager']), wrap(async (req, res) => {
    res.status(201).json(await createProduct({ actor: req.currentUser, payload: req.body || {} }));
  }));

  router.patch('/products/:productId/price', requireStaff(['admin', 'finance_manager', 'catalog_manager']), wrap(async (req, res) => {
    const { unitPrice, currencyCode } = req.body || {};
    if (!unitPrice || isNaN(Number(unitPrice))) {
      return res.status(400).json({ error: 'BAD_REQUEST', message: 'unitPrice is required.' });
    }
    const updated = await query(
      'UPDATE products SET unit_price = $1, currency_code = COALESCE($2, currency_code) WHERE id = $3 RETURNING id, name, unit_price, currency_code',
      [Number(unitPrice), currencyCode || null, req.params.productId]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found.' });
    await recordAdminActivity({
      actorUserId: req.currentUser.user_id,
      actorRole:   req.currentUser.role_name,
      action:      'product.price.updated',
      entityType:  'product',
      entityId:    req.params.productId,
      summary:     `Updated price for product ${req.params.productId} to ${unitPrice}.`,
      metadata:    { unitPrice, currencyCode },
    });
    res.json(updated.rows[0]);
  }));

  router.patch('/products/:productId/status', requireStaff(['admin', 'catalog_manager']), wrap(async (req, res) => {
    const { status } = req.body || {};
    const VALID = ['ACTIVE', 'DRAFT', 'ARCHIVED'];
    if (!VALID.includes(status)) return res.status(400).json({ error: 'BAD_REQUEST', message: `status must be one of ${VALID.join(', ')}.` });
    const updated = await query(
      'UPDATE products SET status = $1 WHERE id = $2 RETURNING id, name, status',
      [status, req.params.productId]
    );
    if (updated.rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Product not found.' });
    res.json(updated.rows[0]);
  }));

  /* ════════════════════════════════════════════════════
     USERS / PEOPLE
     ════════════════════════════════════════════════════ */

  router.get('/users', requireStaff(['admin', 'customer_support']), wrap(async (req, res) => {
    res.json(await listManagedUsers({ search: req.query.search, roleName: req.query.roleName, limit: req.query.limit }));
  }));

  router.post('/users', requireStaff(['admin']), wrap(async (req, res) => {
    res.status(201).json(await createManagedUser({ actor: req.currentUser, payload: req.body || {} }));
  }));

  router.patch('/users/:userId', requireStaff(['admin']), wrap(async (req, res) => {
    res.json(await updateManagedUser({ actor: req.currentUser, userId: req.params.userId, payload: req.body || {} }));
  }));

  /* ════════════════════════════════════════════════════
     CUSTOMER SUPPORT
     ════════════════════════════════════════════════════ */

  router.get('/customers/:customerId', requireStaff(['admin', 'customer_support', 'order_manager']), wrap(async (req, res) => {
    const profile = await getCustomerProfile(req.params.customerId);
    if (!profile?.customer) return res.status(404).json({ error: 'NOT_FOUND', message: 'Customer not found.' });
    res.json(profile);
  }));

  router.get('/customers/:customerId/orders', requireStaff(['admin', 'customer_support', 'order_manager']), wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT order_number, order_status, total_amount, currency_code, placed_at, delivery_eta, shipping_method
       FROM orders WHERE customer_id = $1 ORDER BY placed_at DESC LIMIT 20`,
      [req.params.customerId]
    );
    res.json(rows);
  }));

  /* ════════════════════════════════════════════════════
     PLATFORM SETTINGS
     ════════════════════════════════════════════════════ */

  router.put('/platform-settings', requireStaff(['admin']), wrap(async (req, res) => {
    res.json(await updatePlatformSettings({ actor: req.currentUser, payload: req.body || {} }));
  }));

  /* ════════════════════════════════════════════════════
     EXCHANGE RATES
     ════════════════════════════════════════════════════ */

  router.get('/exchange-rates/status', requireStaff(['admin', 'finance_manager']), wrap(async (_req, res) => {
    res.json(await getExchangeRateSyncStatus());
  }));

  router.post('/exchange-rates/sync', requireStaff(['admin', 'finance_manager']), wrap(async (req, res) => {
    const result = await syncExchangeRates({ trigger: 'manual', force: req.body?.force === true });
    await recordAdminActivity({
      actorUserId: req.currentUser.user_id,
      actorRole:   req.currentUser.role_name,
      action:      'exchange_rates.synced',
      entityType:  'external_service',
      entityId:    'exchange_rates',
      summary:     'Manual exchange-rate sync from staff portal.',
      metadata:    { status: result.status },
    });
    res.json(result);
  }));

  /* ════════════════════════════════════════════════════
     ACTIVITY LOG
     ════════════════════════════════════════════════════ */

  router.get('/activity', requireStaff(), wrap(async (req, res) => {
    res.json(await listAdminActivity({
      limit:      req.query.limit,
      action:     req.query.action,
      entityType: req.query.entityType,
    }));
  }));

  /* ════════════════════════════════════════════════════
     PROMOTIONS
     ════════════════════════════════════════════════════ */

  router.get('/promotions', requireStaff(['admin', 'marketing_manager', 'finance_manager']), wrap(async (_req, res) => {
    const { rows } = await query(
      `SELECT id, code, title, description, discount_type, discount_value,
              minimum_order_amount, is_active, starts_at, ends_at, created_at
       FROM promotions ORDER BY created_at DESC`
    );
    res.json(rows);
  }));

  router.patch('/promotions/:promoId/toggle', requireStaff(['admin', 'marketing_manager']), wrap(async (req, res) => {
    const { rows } = await query(
      'UPDATE promotions SET is_active = NOT is_active WHERE id = $1 RETURNING id, code, title, is_active',
      [req.params.promoId]
    );
    if (rows.length === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Promotion not found.' });
    res.json(rows[0]);
  }));

  /* ════════════════════════════════════════════════════
     REVIEWS (moderation)
     ════════════════════════════════════════════════════ */

  router.get('/reviews', requireStaff(['admin', 'catalog_manager', 'customer_support']), wrap(async (req, res) => {
    const { rows } = await query(
      `SELECT pr.id, pr.rating, pr.title, pr.body, pr.is_verified_purchase, pr.created_at,
              p.name AS product_name, p.slug AS product_slug,
              CONCAT(c.first_name,' ',c.last_name) AS customer_name
       FROM product_reviews pr
       JOIN products p ON p.id = pr.product_id
       JOIN customers c ON c.id = pr.customer_id
       ORDER BY pr.created_at DESC LIMIT $1`,
      [Math.min(100, parseInt(req.query.limit || '50', 10))]
    );
    res.json(rows);
  }));

  router.delete('/reviews/:reviewId', requireStaff(['admin', 'catalog_manager']), wrap(async (req, res) => {
    const { rowCount } = await query('DELETE FROM product_reviews WHERE id = $1', [req.params.reviewId]);
    if (rowCount === 0) return res.status(404).json({ error: 'NOT_FOUND', message: 'Review not found.' });
    res.json({ success: true });
  }));

  return router;
};

module.exports = { createStaffPortalRouter };
