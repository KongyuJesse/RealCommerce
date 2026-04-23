const express = require('express');
const config = require('../config');
const { pool } = require('../db');
const { createAuthRateLimit } = require('../middleware/auth-rate-limit');
const {
  changePassword,
  confirmPasswordReset,
  loginUser,
  logoutUser,
  registerUser,
  requestPasswordReset,
} = require('../services/auth-service');
const {
  addCartItem,
  attachProductImage,
  buildBootstrap,
  calculateQuote,
  cancelOrder,
  completeProductImageUpload,
  createShipmentEvent,
  createAddress,
  createDiscountPromotion,
  createOrder,
  createProduct,
  createReview,
  getAdvancedAnalyticsReport,
  getAdminDashboard,
  getCart,
  getCustomerOrders,
  getCustomerProfile,
  getHomeData,
  getOperationsDashboard,
  getOrderDetail,
  getProductDetail,
  getShipmentTracking,
  listProducts,
  listShipments,
  removeCartItem,
  signProductImageUpload,
  updatePlatformSettings,
  updateCartItem,
  updateOrderStatus,
  updateShipmentStatus,
} = require('../services/commerce-service');
const { getExchangeRates, getLookups } = require('../services/content-service');
const { getStorageStatus } = require('../services/storage-service');
const {
  getWeeklyCategorySales,
  getTopProductsByCategory,
  getCustomerTierMatrix,
  getPriceHistory,
  getExchangeRateDashboard,
  getInventoryHealth,
  getFullAnalyticsBundle,
} = require('../services/analytics-service');
const {
  getWishlist,
  addToWishlist,
  removeFromWishlist,
} = require('../services/wishlist-service');
const { listAdminActivity, recordAdminActivity } = require('../services/activity-log-service');
const {
  createManagedUser,
  createManualReorderRequest,
  createWarehouse,
  listManagedUsers,
  listWarehouses,
  updateManagedUser,
  updateReorderRequestStatus,
  updateWarehouse,
} = require('../services/admin-service');
const {
  getExchangeRateSyncStatus,
  syncExchangeRates,
} = require('../services/exchange-rate-sync-service');
const { buildCookieHeader, wrap } = require('../utils/http');

const createApiRouter = ({ loadSessionUser, clearSessionCookieHeader }) => {
  const router = express.Router();
  const customerRoles = ['customer'];
  const catalogManagerRoles = ['admin', 'catalog_manager', 'marketing_manager'];
  const inventoryManagerRoles = ['admin', 'inventory_manager'];
  const orderManagerRoles = ['admin', 'order_manager', 'shipping_coordinator'];
  const financeRoles = ['admin', 'finance_manager'];
  const supportRoles = ['admin', 'customer_support'];
  const allStaffRoles = ['admin', 'inventory_manager', 'order_manager', 'customer_support', 'marketing_manager', 'finance_manager', 'catalog_manager', 'shipping_coordinator'];
  const orderViewerRoles = ['customer', ...allStaffRoles];
  const loginRateLimit = createAuthRateLimit({
    bucketName: 'auth-login',
    maxAttempts: config.authLoginRateLimitMaxAttempts,
    windowMs: config.authRateLimitWindowMs,
  });
  const registerRateLimit = createAuthRateLimit({
    bucketName: 'auth-register',
    maxAttempts: config.authRegisterRateLimitMaxAttempts,
    windowMs: config.authRateLimitWindowMs,
  });

  const requireAuth = (roles = []) => (request, response, next) => {
    if (!request.currentUser) {
      response.status(401).json({
        error: 'AUTH_REQUIRED',
        message: 'Authentication required.',
        requestId: request.requestId,
      });
      return;
    }

    if (roles.length > 0 && !roles.includes(request.currentUser.role_name)) {
      response.status(403).json({
        error: 'FORBIDDEN',
        message: 'You do not have access to this resource.',
        requestId: request.requestId,
      });
      return;
    }

    next();
  };

  router.get('/health', async (_request, response) => {
    let dbStatus = 'ok';
    let dbLatencyMs = null;
    try {
      const start = Date.now();
      await pool.query('SELECT 1');
      dbLatencyMs = Date.now() - start;
    } catch (_err) {
      dbStatus = 'error';
    }

    const healthy = dbStatus === 'ok';
    response.status(healthy ? 200 : 503).json({
      status: healthy ? 'ok' : 'degraded',
      service: 'realcommerce-api',
      now: new Date().toISOString(),
      db: { status: dbStatus, latencyMs: dbLatencyMs },
      storage: getStorageStatus(),
    });
  });

  router.get('/ready', async (_request, response) => {
    let dbReady = true;
    let dbLatencyMs = null;

    try {
      const startedAt = Date.now();
      await pool.query('SELECT 1');
      dbLatencyMs = Date.now() - startedAt;
    } catch (_error) {
      dbReady = false;
    }

    response.status(dbReady ? 200 : 503).json({
      status: dbReady ? 'ready' : 'not_ready',
      service: 'realcommerce-api',
      now: new Date().toISOString(),
      db: {
        ready: dbReady,
        latencyMs: dbLatencyMs,
      },
    });
  });

  router.get('/storage/status', (_request, response) => {
    response.json(getStorageStatus());
  });

  router.get('/bootstrap', wrap(async (request, response) => {
    response.json(await buildBootstrap(request.currentUser, request.geo));
  }));

  router.get('/geo', wrap(async (request, response) => {
    response.json(request.geo || { countryCode: 'US', currencyCode: 'USD', source: 'default' });
  }));

  router.get('/homepage', wrap(async (_request, response) => {
    response.json(await getHomeData());
  }));

  router.get('/lookups', wrap(async (_request, response) => {
    response.json(await getLookups());
  }));

  router.get('/exchange-rates', wrap(async (_request, response) => {
    response.json(await getExchangeRates());
  }));

  router.get('/categories', wrap(async (_request, response) => {
    response.json((await getLookups()).categories);
  }));

  router.get('/products', wrap(async (request, response) => {
    // Sanitise and normalise query parameters before passing to service
    const rawQuery = request.query;
    const sanitisedQuery = {
      q:        typeof rawQuery.q === 'string'        ? rawQuery.q.trim().slice(0, 200) : undefined,
      category: typeof rawQuery.category === 'string' ? rawQuery.category.trim()        : undefined,
      sort:     typeof rawQuery.sort === 'string'     ? rawQuery.sort.trim()            : undefined,
      inStock:  rawQuery.inStock === 'true' ? 'true' : undefined,
      minPrice: rawQuery.minPrice ? rawQuery.minPrice : undefined,
      maxPrice: rawQuery.maxPrice ? rawQuery.maxPrice : undefined,
      page:     rawQuery.page  ? Math.max(1, parseInt(rawQuery.page,  10) || 1) : 1,
      limit:    rawQuery.limit ? Math.min(100, Math.max(1, parseInt(rawQuery.limit, 10) || 24)) : 24,
      offset:   rawQuery.offset ? Math.max(0, parseInt(rawQuery.offset, 10) || 0) : undefined,
    };
    // Remove undefined keys
    Object.keys(sanitisedQuery).forEach((k) => sanitisedQuery[k] === undefined && delete sanitisedQuery[k]);
    // Convert page to offset if offset not explicitly provided
    if (!sanitisedQuery.offset && sanitisedQuery.page > 1) {
      sanitisedQuery.offset = (sanitisedQuery.page - 1) * sanitisedQuery.limit;
    }
    response.json(await listProducts(sanitisedQuery));
  }));

  router.get('/products/:slug', wrap(async (request, response) => {
    const slug = request.params.slug?.trim();
    if (!slug) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'Product slug is required.' });
      return;
    }
    const product = await getProductDetail(slug);
    if (!product) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Product not found.' });
      return;
    }
    response.json(product);
  }));

  router.get('/products/:slug/images', wrap(async (request, response) => {
    const slug = request.params.slug?.trim();
    const product = slug ? await getProductDetail(slug) : null;
    response.json(product?.images || []);
  }));

  // Removed: Multi-seller logic not applicable to single-seller platform

  router.get('/account/orders', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await getCustomerOrders({
      customerId: request.currentUser.customer_id,
      limit: request.query.limit,
      offset: request.query.offset,
    }));
  }));

  router.patch('/account/password', requireAuth(customerRoles), wrap(async (request, response) => {
    const { changePassword } = require('../services/auth-service');
    await changePassword({
      userId: request.currentUser.user_id,
      currentPassword: request.body?.currentPassword,
      newPassword: request.body?.newPassword,
    });
    response.json({ success: true, message: 'Password updated. Please sign in again.' });
  }));

  router.post('/orders/:orderNumber/cancel', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await cancelOrder({
      orderNumber: request.params.orderNumber,
      customerId: request.currentUser.customer_id,
    }));
  }));

  const resetRateLimit = createAuthRateLimit({
    bucketName: 'auth-reset',
    maxAttempts: 3,
    windowMs: config.authRateLimitWindowMs,
  });

  router.post('/auth/forgot-password', resetRateLimit, wrap(async (request, response) => {
    await requestPasswordReset({ email: request.body?.email });
    response.json({ success: true, message: 'If that email is registered, a reset link has been sent.' });
  }));

  router.post('/auth/reset-password', wrap(async (request, response) => {
    await confirmPasswordReset({ token: request.body?.token, newPassword: request.body?.newPassword });
    response.json({ success: true, message: 'Password updated. Please sign in.' });
  }));

  router.post('/auth/register', registerRateLimit, wrap(async (request, response) => {
    const user = await registerUser(request.body || {});
    response.status(201).json({ message: 'Account created successfully.', user });
  }));

  router.post('/auth/login', loginRateLimit, wrap(async (request, response) => {
    const { sessionToken, sessionUser } = await loginUser({
      email: request.body?.email,
      password: request.body?.password,
      userAgent: request.headers['user-agent'],
      ipAddress: request.ip,
    });

    response.setHeader(
      'Set-Cookie',
      buildCookieHeader({
        name: config.sessionCookieName,
        value: sessionToken,
        secure: config.sessionCookieSecure,
        maxAgeSeconds: config.sessionTtlDays * 24 * 60 * 60,
        sameSite: config.sessionCookieSameSite,
        domain: config.sessionCookieDomain,
      })
    );

    response.json(await buildBootstrap(sessionUser, request.geo));
  }));

  router.post('/auth/logout', wrap(async (request, response) => {
    await logoutUser(request.sessionToken);
    response.setHeader('Set-Cookie', clearSessionCookieHeader);
    response.json({ success: true });
  }));

  router.get('/auth/session', wrap(async (request, response) => {
    response.json(await buildBootstrap(await loadSessionUser(request.sessionToken), request.geo));
  }));

  router.get('/cart', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await getCart(request.currentUser.customer_id));
  }));

  router.post('/cart/items', requireAuth(customerRoles), wrap(async (request, response) => {
    response.status(201).json(await addCartItem({
      customerId: request.currentUser.customer_id,
      productId: request.body?.productId,
      quantity: request.body?.quantity,
    }));
  }));

  router.patch('/cart/items/:itemId', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await updateCartItem({
      customerId: request.currentUser.customer_id,
      itemId: request.params.itemId,
      quantity: request.body?.quantity,
    }));
  }));

  router.delete('/cart/items/:itemId', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await removeCartItem({
      customerId: request.currentUser.customer_id,
      itemId: request.params.itemId,
    }));
  }));

  router.post('/checkout/quote', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await calculateQuote(request.currentUser.customer_id, request.body || {}));
  }));

  router.post('/checkout/complete', requireAuth(customerRoles), wrap(async (request, response) => {
    response.status(201).json(await createOrder({
      currentUser: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.get('/dashboard/customer', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await getCustomerProfile(request.currentUser.customer_id));
  }));

  router.get('/dashboard/admin', requireAuth(['admin']), wrap(async (_request, response) => {
    response.json(await getAdminDashboard());
  }));

  router.get('/dashboard/inventory', requireAuth(inventoryManagerRoles), wrap(async (_request, response) => {
    response.json(await getOperationsDashboard());
  }));

  router.get('/dashboard/orders', requireAuth(orderManagerRoles), wrap(async (_request, response) => {
    response.json(await getOperationsDashboard());
  }));

  router.get('/dashboard/support', requireAuth(supportRoles), wrap(async (_request, response) => {
    response.json(await getCustomerProfile(null));
  }));

  router.get('/dashboard/marketing', requireAuth(['admin', 'marketing_manager']), wrap(async (_request, response) => {
    response.json(await getAdminDashboard());
  }));

  router.get('/dashboard/finance', requireAuth(financeRoles), wrap(async (_request, response) => {
    response.json(await getAdminDashboard());
  }));

  router.get('/dashboard/catalog', requireAuth(catalogManagerRoles), wrap(async (_request, response) => {
    response.json(await getAdminDashboard());
  }));

  router.get('/dashboard/shipping', requireAuth(['admin', 'shipping_coordinator']), wrap(async (_request, response) => {
    response.json(await getOperationsDashboard());
  }));

  router.get('/dashboard/operations', requireAuth(allStaffRoles), wrap(async (_request, response) => {
    response.json(await getOperationsDashboard());
  }));

  router.post('/account/addresses', requireAuth(customerRoles), wrap(async (request, response) => {
    response.status(201).json(await createAddress({
      customerId: request.currentUser.customer_id,
      fullName: request.currentUser.full_name,
      payload: request.body || {},
    }));
  }));

  router.post('/reviews', requireAuth(customerRoles), wrap(async (request, response) => {
    response.status(201).json(await createReview({
      customerId: request.currentUser.customer_id,
      payload: request.body || {},
    }));
  }));

  router.get('/orders/:orderNumber', requireAuth(orderViewerRoles), wrap(async (request, response) => {
    const order = await getOrderDetail(request.params.orderNumber, request.currentUser);
    if (!order) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Order not found.' });
      return;
    }
    response.json(order);
  }));

  /* ── New account management endpoints ── */

  router.patch('/account/profile', requireAuth(customerRoles), wrap(async (request, response) => {
    const { fullName, city, phone } = request.body || {};
    const customerId = request.currentUser.customer_id;
    const userId = request.currentUser.user_id;
    const normalizedFullName = typeof fullName === 'string' ? fullName.trim().replace(/\s+/g, ' ') : '';
    const normalizedCity = typeof city === 'string' ? city.trim() : '';
    const normalizedPhone = typeof phone === 'string' ? phone.trim() : '';

    if (!normalizedFullName && !normalizedCity && !normalizedPhone) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'At least one profile field must be provided.' });
      return;
    }

    if (normalizedFullName) {
      const [firstName, ...rest] = normalizedFullName.split(' ');
      await pool.query(
        `
          UPDATE customers
          SET
            first_name = $1,
            last_name = $2,
            city = COALESCE(NULLIF($3, ''), city),
            phone = COALESCE(NULLIF($4, ''), phone)
          WHERE id = $5
        `,
        [firstName, rest.join(' ') || firstName, normalizedCity, normalizedPhone, customerId]
      );
      await pool.query('UPDATE users SET full_name = $1 WHERE id = $2', [normalizedFullName, userId]);
    } else {
      await pool.query(
        `
          UPDATE customers
          SET
            city = COALESCE(NULLIF($1, ''), city),
            phone = COALESCE(NULLIF($2, ''), phone)
          WHERE id = $3
        `,
        [normalizedCity, normalizedPhone, customerId]
      );
    }

    response.json({ success: true, message: 'Profile updated.' });
  }));

  router.delete('/account/addresses/:id', requireAuth(customerRoles), wrap(async (request, response) => {
    const addressId = parseInt(request.params.id, 10);
    const customerId = request.currentUser.customer_id;
    if (!Number.isFinite(addressId)) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid address ID.' });
      return;
    }
    const { rowCount } = await pool.query(
      `DELETE FROM customer_addresses WHERE id = $1 AND customer_id = $2`,
      [addressId, customerId]
    );
    if (rowCount === 0) {
      response.status(404).json({ error: 'NOT_FOUND', message: 'Address not found.' });
      return;
    }
    response.json({ success: true, message: 'Address deleted.' });
  }));

  router.get('/tracking/shipments/:trackingNumber', requireAuth(orderViewerRoles), wrap(async (request, response) => {
    const shipment = await getShipmentTracking(request.params.trackingNumber, request.currentUser);
    if (!shipment) {
      response.status(404).json({ message: 'Shipment not found.' });
      return;
    }
    response.json(shipment);
  }));

  router.post('/admin/products', requireAuth(catalogManagerRoles), wrap(async (request, response) => {
    response.status(201).json(await createProduct({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.post('/admin/discounts', requireAuth(['admin', 'marketing_manager', 'finance_manager']), wrap(async (request, response) => {
    response.status(201).json(await createDiscountPromotion({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.post('/admin/products/:productId/images', requireAuth(catalogManagerRoles), wrap(async (request, response) => {
    response.status(201).json(await attachProductImage({
      actor: request.currentUser,
      productId: request.params.productId,
      publicUrl: request.body?.publicUrl,
      sourceUrl: request.body?.sourceUrl,
      altText: request.body?.altText,
      isPrimary: request.body?.isPrimary,
    }));
  }));

  router.patch('/admin/orders/:orderId/status', requireAuth(orderManagerRoles), wrap(async (request, response) => {
    await updateOrderStatus({
      orderId: request.params.orderId,
      status: request.body?.status,
      actorUserId: request.currentUser.user_id,
      actorRole: request.currentUser.role_name,
      note: request.body?.note,
    });
    response.json({ success: true });
  }));

  router.patch('/admin/shipments/:shipmentId/status', requireAuth(['admin', 'shipping_coordinator', 'order_manager']), wrap(async (request, response) => {
    await updateShipmentStatus({
      shipmentId: request.params.shipmentId,
      status: request.body?.status,
      location: request.body?.location,
      note: request.body?.note,
      actorUserId: request.currentUser.user_id,
      actorRole: request.currentUser.role_name,
    });
    response.json({ success: true });
  }));

  router.get('/admin/shipments', requireAuth(['admin', 'shipping_coordinator', 'order_manager']), wrap(async (request, response) => {
    response.json(await listShipments(request.query || {}));
  }));

  router.get('/admin/reports/advanced-database', requireAuth(allStaffRoles), wrap(async (_request, response) => {
    response.json(await getAdvancedAnalyticsReport());
  }));

  router.post('/admin/shipments/:shipmentId/events', requireAuth(['admin', 'shipping_coordinator', 'order_manager']), wrap(async (request, response) => {
    response.status(201).json(await createShipmentEvent({
      shipmentId: request.params.shipmentId,
      payload: request.body || {},
      actorUserId: request.currentUser.user_id,
      actorRole: request.currentUser.role_name,
    }));
  }));

  router.put('/admin/platform-settings', requireAuth(['admin']), wrap(async (request, response) => {
    response.json(await updatePlatformSettings({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.get('/admin/users', requireAuth(['admin']), wrap(async (request, response) => {
    response.json(
      await listManagedUsers({
        search: request.query.search,
        roleName: request.query.roleName,
        limit: request.query.limit,
      })
    );
  }));

  router.post('/admin/users', requireAuth(['admin']), wrap(async (request, response) => {
    response.status(201).json(await createManagedUser({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.patch('/admin/users/:userId', requireAuth(['admin']), wrap(async (request, response) => {
    response.json(
      await updateManagedUser({
        actor: request.currentUser,
        userId: request.params.userId,
        payload: request.body || {},
      })
    );
  }));

  router.get('/admin/warehouses', requireAuth(inventoryManagerRoles), wrap(async (_request, response) => {
    response.json(await listWarehouses());
  }));

  router.post('/admin/warehouses', requireAuth(inventoryManagerRoles), wrap(async (request, response) => {
    response.status(201).json(await createWarehouse({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.patch('/admin/warehouses/:warehouseId', requireAuth(inventoryManagerRoles), wrap(async (request, response) => {
    response.json(
      await updateWarehouse({
        actor: request.currentUser,
        warehouseId: request.params.warehouseId,
        payload: request.body || {},
      })
    );
  }));

  router.post('/admin/reorder-requests', requireAuth(inventoryManagerRoles), wrap(async (request, response) => {
    response.status(201).json(await createManualReorderRequest({
      actor: request.currentUser,
      payload: request.body || {},
    }));
  }));

  router.patch('/admin/reorder-requests/:requestId/status', requireAuth(inventoryManagerRoles), wrap(async (request, response) => {
    response.json(
      await updateReorderRequestStatus({
        actor: request.currentUser,
        requestId: request.params.requestId,
        payload: request.body || {},
      })
    );
  }));

  router.get('/admin/integrations/exchange-rates', requireAuth(allStaffRoles), wrap(async (_request, response) => {
    response.json(await getExchangeRateSyncStatus());
  }));

  router.get('/admin/activity', requireAuth(allStaffRoles), wrap(async (request, response) => {
    response.json(
      await listAdminActivity({
        limit: request.query.limit,
        action: request.query.action,
        entityType: request.query.entityType,
      })
    );
  }));

  router.post('/admin/integrations/exchange-rates/sync', requireAuth(['admin', 'finance_manager']), wrap(async (request, response) => {
    const result = await syncExchangeRates({
      trigger: 'manual',
      force: request.body?.force === true,
    });

    await recordAdminActivity({
      actorUserId: request.currentUser.user_id,
      actorRole: request.currentUser.role_name,
      action: 'exchange_rates.synced',
      entityType: 'external_service',
      entityId: 'exchange_rates',
      summary: `Triggered manual exchange-rate synchronization.`,
      metadata: {
        status: result.status,
        pairCount: result.pairCount || null,
      },
    });

    response.json(result);
  }));

  router.post('/uploads/product-images/sign', requireAuth(catalogManagerRoles), wrap(async (request, response) => {
    response.json(await signProductImageUpload({
      actor: request.currentUser,
      productId: request.body?.productId,
      fileName: request.body?.fileName,
      mimeType: request.body?.mimeType,
    }));
  }));

  router.post('/uploads/product-images/:imageId/complete', requireAuth(catalogManagerRoles), wrap(async (request, response) => {
    response.json(await completeProductImageUpload({
      actor: request.currentUser,
      imageId: request.params.imageId,
      productId: request.body?.productId,
      publicUrl: request.body?.publicUrl,
      altText: request.body?.altText,
      isPrimary: request.body?.isPrimary,
    }));
  }));

  /* ── Analytics endpoints (admin / ops / merchandising) ── */
  const analyticsRoles = allStaffRoles;

  router.get('/analytics', requireAuth(analyticsRoles), wrap(async (_request, response) => {
    response.json(await getFullAnalyticsBundle());
  }));

  router.get('/analytics/weekly-sales', requireAuth(analyticsRoles), wrap(async (request, response) => {
    const weeksBack = Math.min(52, Math.max(1, parseInt(request.query.weeks || '12', 10)));
    response.json(await getWeeklyCategorySales({ weeksBack }));
  }));

  router.get('/analytics/top-products', requireAuth(analyticsRoles), wrap(async (request, response) => {
    const limit = Math.min(100, Math.max(1, parseInt(request.query.limit || '20', 10)));
    response.json(await getTopProductsByCategory({ limit }));
  }));

  router.get('/analytics/customer-tiers', requireAuth(analyticsRoles), wrap(async (request, response) => {
    response.json(await getCustomerTierMatrix());
  }));

  router.get('/analytics/price-history', requireAuth(analyticsRoles), wrap(async (request, response) => {
    const productId = request.query.productId ? parseInt(request.query.productId, 10) : null;
    response.json(await getPriceHistory({ productId }));
  }));

  router.get('/analytics/exchange-rates', requireAuth(analyticsRoles), wrap(async (_request, response) => {
    response.json(await getExchangeRateDashboard());
  }));

  router.get('/analytics/inventory-health', requireAuth(inventoryManagerRoles), wrap(async (_request, response) => {
    response.json(await getInventoryHealth());
  }));

  /* ── Wishlist endpoints (customer only) ── */
  router.get('/wishlist', requireAuth(customerRoles), wrap(async (request, response) => {
    response.json(await getWishlist(request.currentUser.customer_id));
  }));

  router.post('/wishlist', requireAuth(customerRoles), wrap(async (request, response) => {
    const productId = parseInt(request.body?.productId, 10);
    if (!Number.isFinite(productId)) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'productId is required.' });
      return;
    }
    response.status(201).json(await addToWishlist(request.currentUser.customer_id, productId));
  }));

  router.delete('/wishlist/:productId', requireAuth(customerRoles), wrap(async (request, response) => {
    const productId = parseInt(request.params.productId, 10);
    if (!Number.isFinite(productId)) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid product ID.' });
      return;
    }
    response.json(await removeFromWishlist(request.currentUser.customer_id, productId));
  }));

  router.post('/wishlist/:productId/move-to-cart', requireAuth(customerRoles), wrap(async (request, response) => {
    const productId = parseInt(request.params.productId, 10);
    if (!Number.isFinite(productId)) {
      response.status(400).json({ error: 'BAD_REQUEST', message: 'Invalid product ID.' });
      return;
    }
    await addCartItem({
      customerId: request.currentUser.customer_id,
      productId,
      quantity: 1,
    });
    await removeFromWishlist(request.currentUser.customer_id, productId);
    response.json({ success: true, productId });
  }));

  return router;
};

module.exports = {
  createApiRouter,
};
