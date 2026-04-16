import { useEffect, useState } from 'react';
import DashboardCard from '../components/DashboardCard';
import MetricPanel from '../components/MetricPanel';
import ProductCard from '../components/ProductCard';
import StatusPill from '../components/StatusPill';
import { formatDate, money, roleLabel, statusLabel } from '../lib/format';
import AccessPage from './AccessPage';

const titleize = (value = '') =>
  String(value || '')
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (match) => match.toUpperCase());

const getDefaultTab = (session) => {
  const capabilities = session?.capabilities || {};

  if (session?.roleName === 'customer') {
    return 'overview';
  }

  if (capabilities.canManageOperations) {
    return 'operations';
  }

  if (capabilities.canManageCatalog) {
    return 'catalog';
  }

  if (capabilities.canManagePeople) {
    return 'people';
  }

  return 'command';
};

const buildTabs = (session) => {
  const capabilities = session?.capabilities || {};

  if (session?.roleName === 'customer') {
    return [
      { id: 'overview', label: 'Overview' },
      { id: 'orders', label: 'Orders' },
      { id: 'saved', label: 'Saved' },
      { id: 'profile', label: 'Profile' },
    ];
  }

  const tabs = [{ id: 'command', label: 'Command' }];

  if (capabilities.canManageOperations) {
    tabs.push({ id: 'operations', label: 'Operations' });
  }

  if (capabilities.canManageCatalog) {
    tabs.push({ id: 'catalog', label: 'Catalog' });
  }

  if (capabilities.canManageWarehouses) {
    tabs.push({ id: 'warehouses', label: 'Warehouses' });
  }

  if (capabilities.canManagePeople) {
    tabs.push({ id: 'people', label: 'People' });
  }

  if (capabilities.canManageExchangeRates || capabilities.canViewAnalytics) {
    tabs.push({ id: 'rates', label: 'Rates' });
  }

  return tabs;
};

const DashboardPage = (props) => {
  const {
    session,
    customerDashboard,
    adminDashboard,
    operationsDashboard,
    addToCart,
    onNavigate,
    signOut,
    renderProductComposer,
    setCheckoutForm,
    applyAddressToCheckout,
    opsForm,
    setOpsForm,
    submitOpsUpdate,
    discountForm,
    setDiscountForm,
    submitDiscountCampaign,
    managedUserForm,
    setManagedUserForm,
    submitManagedUser,
    platformSettingsForm,
    setPlatformSettingsForm,
    submitPlatformSettings,
    refreshExchangeRateSync,
    saveCustomerProfile,
    submitWarehouse,
    toggleManagedUserStatus,
    toggleWarehouseStatus,
    warehouseForm,
    setWarehouseForm,
    categories,
    accessPageProps,
  } = props;

  const defaultTab = getDefaultTab(session);
  const [activeTab, setActiveTab] = useState(defaultTab);
  const [profileForm, setProfileForm] = useState({ fullName: '', city: '', phone: '' });

  useEffect(() => {
    setActiveTab(defaultTab);
  }, [defaultTab]);

  useEffect(() => {
    const customer = customerDashboard?.customer;
    if (!customer) {
      return;
    }

    setProfileForm({
      fullName: [customer.first_name, customer.last_name].filter(Boolean).join(' ').trim(),
      city: customer.city || '',
      phone: customer.phone || '',
    });
  }, [customerDashboard?.customer]);

  const tabs = buildTabs(session);
  const capabilities = session?.capabilities || {};
  const operationsOverview = operationsDashboard?.overview || {};
  const adminOverview = adminDashboard?.overview || {};
  const analytics = adminDashboard?.analytics || {};
  const customer = customerDashboard?.customer || null;
  const recentOrders = customerDashboard?.recentOrders || [];
  const wishlistSummary = customerDashboard?.wishlistSummary || { count: 0, items: [] };
  const recommendations = customerDashboard?.recommendations || [];
  const loyaltyJourney = customerDashboard?.loyaltyJourney || null;
  const profileCompleteness = customerDashboard?.profileCompleteness || { percent: 0, completedFields: 0, totalFields: 0 };
  const userDirectory = adminDashboard?.userDirectory || [];
  const warehouseNetwork = adminDashboard?.warehouseNetwork || operationsDashboard?.warehouses || [];
  const reorderQueue = operationsDashboard?.reorderQueue || adminDashboard?.reorderQueue || [];
  const exchangeService =
    adminDashboard?.externalServices?.exchangeRates ||
    operationsDashboard?.externalServices?.exchangeRates ||
    null;
  const storageService = adminDashboard?.externalServices?.storage || null;
  const rateRows = analytics.exchangeRates || [];
  const canManageCatalog = Boolean(capabilities.canManageCatalog);
  const canManageOperations = Boolean(capabilities.canManageOperations);
  const canManagePeople = Boolean(capabilities.canManagePeople);
  const canManageWarehouses = Boolean(capabilities.canManageWarehouses);
  const canViewRates = Boolean(capabilities.canManageExchangeRates || capabilities.canViewAnalytics);

  useEffect(() => {
    if (!tabs.some((tab) => tab.id === activeTab)) {
      setActiveTab(tabs[0]?.id || defaultTab);
    }
  }, [activeTab, defaultTab, tabs]);

  if (!session) {
    return <AccessPage {...accessPageProps} />;
  }

  const renderOrderTable = (orders = []) => (
    <div className="data-table-container">
      <table className="data-table">
        <thead>
          <tr>
            <th>Order</th>
            <th>Date</th>
            <th>Status</th>
            <th>Total</th>
          </tr>
        </thead>
        <tbody>
          {orders.length > 0 ? orders.map((order) => (
            <tr key={order.order_number} onClick={() => onNavigate('order', order.order_number)}>
              <td style={{ color: 'var(--link)', fontWeight: 700 }}>{order.order_number}</td>
              <td>{formatDate(order.placed_at)}</td>
              <td><StatusPill value={order.order_status} /></td>
              <td style={{ fontWeight: 700 }}>{money(order.total_amount || order.seller_gross || 0, order.currency_code)}</td>
            </tr>
          )) : (
            <tr>
              <td colSpan={4} className="muted-copy">No orders to show yet.</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );

  return (
    <section className="section-shell">
      <header className="dashboard-header-pro">
        <div className="profile-badge">
          <div className="profile-avatar" aria-hidden="true" title={session.fullName}>
            {session.fullName?.charAt(0)?.toUpperCase()}
          </div>
          <div>
            <h2>{session.fullName}</h2>
            <span className="section-eyebrow" style={{ marginBottom: 0 }}>
              {titleize(roleLabel(session.roleName))} Workspace
            </span>
          </div>
        </div>
        <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
          {capabilities.canViewAnalytics ? (
            <button className="ghost-btn" type="button" onClick={() => onNavigate('analytics')}>
              Analytics
            </button>
          ) : null}
          {capabilities.canManageWarehouses ? (
            <button className="ghost-btn" type="button" onClick={() => onNavigate('inventory')}>
              Inventory
            </button>
          ) : null}
          <button className="ghost-btn" type="button" onClick={signOut}>Sign out</button>
        </div>
      </header>

      <nav className="dashboard-tabs" aria-label="Dashboard sections">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`dashboard-tab ${activeTab === tab.id ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            aria-selected={activeTab === tab.id}
            role="tab"
          >
            {tab.label}
          </button>
        ))}
      </nav>

      {activeTab === 'overview' && session.roleName === 'customer' ? (
        <div className="dashboard-sections">
          <div className="stats-inline">
            <MetricPanel
              title="Customer Tier"
              value={customer?.tier_name || session.tierName || 'Starter'}
              detail={`${customer?.discount_rate || session.discountRate || 0}% automatic pricing`}
            />
            <MetricPanel
              title="Lifetime Value"
              value={money(customer?.lifetime_value || 0)}
              detail={loyaltyJourney ? `${money(loyaltyJourney.amountRemaining)} to ${loyaltyJourney.nextTier}` : 'Top tier unlocked'}
            />
            <MetricPanel
              title="Saved Items"
              value={wishlistSummary.count || 0}
              detail="Wishlist and fast-return products"
            />
            <MetricPanel
              title="Profile Health"
              value={`${profileCompleteness.percent || 0}%`}
              detail={`${profileCompleteness.completedFields || 0}/${profileCompleteness.totalFields || 0} fields complete`}
            />
          </div>

          {loyaltyJourney ? (
            <div className="note-banner">
              You are {money(loyaltyJourney.amountRemaining)} away from the {loyaltyJourney.nextTier} tier and {loyaltyJourney.nextTierDiscountRate}% automatic savings.
            </div>
          ) : null}

          <div className="feature-grid" style={{ gridTemplateColumns: '1.2fr 0.8fr' }}>
            <DashboardCard title="Recommended for You" copy="Suggestions based on your order history and saved categories.">
              {recommendations.length > 0 ? (
                <div className="product-grid">
                  {recommendations.map((product) => (
                    <ProductCard
                      key={product.id}
                      product={product}
                      onOpen={(slug) => onNavigate('product', slug)}
                      onAdd={addToCart}
                    />
                  ))}
                </div>
              ) : (
                <p className="muted-copy">Recommendations will start appearing once you browse or place orders.</p>
              )}
            </DashboardCard>

            <DashboardCard title="Quick Actions" copy="Continue shopping, access saved items, or jump straight to checkout.">
              <div className="card-list">
                <div className="list-row">
                  <span>
                    <strong>Saved addresses</strong>
                    <small>{(customerDashboard?.addresses || []).length} checkout-ready locations</small>
                  </span>
                  <button className="ghost-btn ghost-btn-small" type="button" onClick={() => setActiveTab('saved')}>
                    Manage
                  </button>
                </div>
                <div className="list-row">
                  <span>
                    <strong>Wishlist</strong>
                    <small>{wishlistSummary.count || 0} products ready to revisit</small>
                  </span>
                  <button className="ghost-btn ghost-btn-small" type="button" onClick={() => onNavigate('wishlist')}>
                    Open
                  </button>
                </div>
                <div className="list-row">
                  <span>
                    <strong>Latest order</strong>
                    <small>{recentOrders[0]?.order_number || 'No orders yet'}</small>
                  </span>
                  <button
                    className="ghost-btn ghost-btn-small"
                    type="button"
                    onClick={() => recentOrders[0] ? onNavigate('order', recentOrders[0].order_number) : onNavigate('catalog')}
                  >
                    {recentOrders[0] ? 'Track' : 'Shop'}
                  </button>
                </div>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === 'orders' && session.roleName === 'customer' ? (
        <div className="dashboard-sections">
          <DashboardCard title="Order History" copy="Track every shipment, payment, and delivery milestone from your customer account.">
            {renderOrderTable(recentOrders)}
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === 'saved' && session.roleName === 'customer' ? (
        <div className="feature-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
          <DashboardCard title="Saved Addresses" copy="Use any verified address to jump directly into checkout.">
            <div className="card-list">
              {(customerDashboard?.addresses || []).map((address) => (
                <div className="list-row" key={address.id}>
                  <span>
                    <strong>{address.label}</strong>
                    <small>{address.line1}, {address.city}, {address.country}</small>
                  </span>
                  <button
                    className="ghost-btn ghost-btn-small"
                    type="button"
                    onClick={() => {
                      setCheckoutForm((current) => ({
                        ...current,
                        shippingAddress: applyAddressToCheckout(address),
                      }));
                      onNavigate('checkout');
                    }}
                  >
                    Checkout
                  </button>
                </div>
              ))}
            </div>
          </DashboardCard>

          <DashboardCard title="Wishlist Preview" copy="Products you have saved and can move back into checkout whenever you are ready.">
            {wishlistSummary.items?.length > 0 ? (
              <div className="product-grid">
                {wishlistSummary.items.map((product) => (
                  <ProductCard
                    key={product.id}
                    product={product}
                    onOpen={(slug) => onNavigate('product', slug)}
                    onAdd={addToCart}
                  />
                ))}
              </div>
            ) : (
              <p className="muted-copy">Your wishlist is still empty.</p>
            )}
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === 'profile' && session.roleName === 'customer' ? (
        <div className="feature-grid" style={{ gridTemplateColumns: '0.9fr 1.1fr' }}>
          <DashboardCard title="Account Snapshot" copy="Your account, loyalty, and location details at a glance.">
            <div className="summary-rows">
              <div><span>Email</span><strong>{customer?.email || session.email}</strong></div>
              <div><span>City</span><strong>{customer?.city || 'Not set'}</strong></div>
              <div><span>Country</span><strong>{customer?.country || 'Not set'}</strong></div>
              <div><span>Phone</span><strong>{customer?.phone || 'Not set'}</strong></div>
              <div><span>Tier</span><strong>{customer?.tier_name || 'Starter'}</strong></div>
            </div>
          </DashboardCard>

          <DashboardCard title="Update Profile" copy="Keep your customer dashboard personalized with your latest location and contact details.">
            <form
              onSubmit={(event) => {
                event.preventDefault();
                saveCustomerProfile(profileForm);
              }}
              className="stack-form"
            >
              <div className="form-grid">
                <input
                  className="field-span-2"
                  value={profileForm.fullName}
                  onChange={(event) => setProfileForm((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Full name"
                />
                <input
                  value={profileForm.city}
                  onChange={(event) => setProfileForm((current) => ({ ...current, city: event.target.value }))}
                  placeholder="City"
                />
                <input
                  value={profileForm.phone}
                  onChange={(event) => setProfileForm((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="Phone"
                />
              </div>
              <button className="accent-btn" type="submit">Save profile</button>
            </form>
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === 'command' && session.roleName !== 'customer' ? (
        <div className="dashboard-sections">
          <div className="stats-inline">
            <MetricPanel
              title="Revenue (30d)"
              value={money(adminOverview.monthly_revenue || 0, adminOverview.base_currency_code || 'USD')}
              detail={`${adminOverview.monthly_orders || 0} marketplace orders`}
            />
            <MetricPanel
              title="Active Users"
              value={adminOverview.active_users || 0}
              detail={`${adminOverview.customer_count || 0} customers / ${adminOverview.staff_count || 0} staff`}
            />
            <MetricPanel
              title="Warehouse Network"
              value={adminOverview.active_warehouses || warehouseNetwork.filter((item) => item.is_active).length || 0}
              detail={`${adminOverview.warehouse_alerts || 0} SKU alerts`}
            />
            <MetricPanel
              title="Exchange Sync"
              value={titleize(exchangeService?.lastRun?.status || 'Pending')}
              detail={formatDate(exchangeService?.lastRun?.completed_at || exchangeService?.latestEffectiveAt)}
            />
          </div>

          <div className="feature-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <DashboardCard title="Recent Orders" copy="Newest orders across the platform, ready for support and operational follow-up.">
              {renderOrderTable(adminDashboard?.recentOrders || [])}
            </DashboardCard>

            <DashboardCard title="Platform Watchlist" copy="Low-stock products, storage readiness, and next-action signals for the team.">
              <div className="card-list">
                {(adminDashboard?.lowStock || []).slice(0, 6).map((item) => (
                  <div className="list-row" key={item.id}>
                    <span>
                      <strong>{item.name}</strong>
                      <small>{item.available_units} on hand / reorder at {item.reorder_point}</small>
                    </span>
                    <button className="ghost-btn ghost-btn-small" type="button" onClick={() => onNavigate('product', item.slug)}>
                      Review
                    </button>
                  </div>
                ))}
                {storageService ? (
                  <div className="list-row">
                    <span>
                      <strong>Media storage</strong>
                      <small>{storageService.configured ? `Connected to ${storageService.provider}` : 'Storage is not fully configured yet'}</small>
                    </span>
                    <span style={{ fontWeight: 700 }}>{storageService.configured ? 'Ready' : 'Check env'}</span>
                  </div>
                ) : null}
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === 'operations' && canManageOperations ? (
        <div className="dashboard-sections">
          <div className="stats-inline">
            <MetricPanel
              title="Active Shipments"
              value={operationsOverview.active_shipments || (operationsDashboard?.shipments || []).length || 0}
              detail={`${operationsOverview.delivered_shipments || 0} delivered so far`}
            />
            <MetricPanel
              title="Delayed"
              value={operationsOverview.delayed_shipments || 0}
              detail="Needs intervention"
            />
            <MetricPanel
              title="On-time Delivery"
              value={`${Number(operationsOverview.on_time_delivery_rate || 0).toFixed(1)}%`}
              detail={`${operationsOverview.shipment_count || 0} tracked shipments`}
            />
            <MetricPanel
              title="Open Reorders"
              value={reorderQueue.length}
              detail="Auto and manual restock requests"
            />
          </div>

          <div className="feature-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <DashboardCard title="Fulfillment Board" copy="Latest shipment activity across the warehouse network.">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Order</th>
                      <th>Tracking</th>
                      <th>Status</th>
                      <th>Location</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(operationsDashboard?.shipments || []).map((shipment) => (
                      <tr key={shipment.id} onClick={() => onNavigate('order', shipment.order_number)}>
                        <td style={{ color: 'var(--link)', fontWeight: 700 }}>{shipment.order_number}</td>
                        <td>{shipment.tracking_number || 'Pending'}</td>
                        <td><StatusPill value={shipment.shipment_status} /></td>
                        <td>{shipment.trackingSummary?.latestLocation || shipment.last_known_location || 'Awaiting scan'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>

            <DashboardCard title="Operational Command" copy="Update order and shipment states without leaving the dashboard.">
              <form onSubmit={submitOpsUpdate} className="stack-form">
                <div className="form-grid operations-form-grid">
                  <input
                    value={opsForm.orderId}
                    onChange={(event) => setOpsForm((current) => ({ ...current, orderId: event.target.value }))}
                    placeholder="Order ID"
                  />
                  <select
                    value={opsForm.orderStatus}
                    onChange={(event) => setOpsForm((current) => ({ ...current, orderStatus: event.target.value }))}
                  >
                    {['PENDING', 'PROCESSING', 'PAID', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((status) => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </select>
                  <input
                    value={opsForm.shipmentId}
                    onChange={(event) => setOpsForm((current) => ({ ...current, shipmentId: event.target.value }))}
                    placeholder="Shipment ID"
                  />
                  <select
                    value={opsForm.shipmentStatus}
                    onChange={(event) => setOpsForm((current) => ({ ...current, shipmentStatus: event.target.value }))}
                  >
                    {['PENDING', 'PICKING', 'PACKED', 'IN_TRANSIT', 'DELIVERED', 'RETURNED'].map((status) => (
                      <option key={status} value={status}>{statusLabel(status)}</option>
                    ))}
                  </select>
                  <textarea
                    className="field-span-4"
                    value={opsForm.note}
                    onChange={(event) => setOpsForm((current) => ({ ...current, note: event.target.value }))}
                    placeholder="Internal operational note"
                  />
                </div>
                <button className="accent-btn" type="submit">Apply update</button>
              </form>
            </DashboardCard>
          </div>

          <DashboardCard title="Reorder Queue" copy="Live restock work generated by low-stock rules and manual warehouse requests.">
            <div className="card-list">
              {reorderQueue.length > 0 ? reorderQueue.map((request) => (
                <div className="list-row" key={request.id}>
                  <span>
                    <strong>{request.product_name}</strong>
                    <small>{request.warehouse_name} | on hand {request.quantity_on_hand} / reorder {request.reorder_point}</small>
                  </span>
                  <span style={{ fontWeight: 700 }}>+{request.quantity_requested}</span>
                </div>
              )) : (
                <p className="muted-copy">No reorder requests are open.</p>
              )}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === 'catalog' && canManageCatalog ? (
        <div className="dashboard-sections">
          <div className="feature-grid" style={{ gridTemplateColumns: '1.1fr 0.9fr' }}>
            <DashboardCard title="Catalog Composer" copy="Create products with stock allocations, imagery, and merchandising data in one flow.">
              {renderProductComposer ? renderProductComposer() : null}
            </DashboardCard>

            <DashboardCard title="Launch Controls" copy="Run promotions and tune platform defaults from the same operating surface.">
              <form onSubmit={submitDiscountCampaign} className="stack-form" style={{ marginBottom: '1rem' }}>
                <div className="form-grid">
                  <input
                    className="field-span-2"
                    value={discountForm.name}
                    onChange={(event) => setDiscountForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Campaign name"
                  />
                  <select
                    value={discountForm.discountType}
                    onChange={(event) => setDiscountForm((current) => ({ ...current, discountType: event.target.value }))}
                  >
                    <option value="PERCENT">Percent off</option>
                    <option value="FIXED">Fixed amount off</option>
                  </select>
                  <input
                    value={discountForm.discountValue}
                    onChange={(event) => setDiscountForm((current) => ({ ...current, discountValue: event.target.value }))}
                    placeholder="Discount value"
                  />
                  <select
                    className="field-span-2"
                    value={discountForm.appliesTo}
                    onChange={(event) => setDiscountForm((current) => ({ ...current, appliesTo: event.target.value }))}
                  >
                    <option value="ALL_PRODUCTS">All products</option>
                    <option value="CATEGORY">Category</option>
                  </select>
                  {discountForm.appliesTo === 'CATEGORY' ? (
                    <select
                      className="field-span-2"
                      value={discountForm.categoryId}
                      onChange={(event) => setDiscountForm((current) => ({ ...current, categoryId: event.target.value }))}
                    >
                      <option value="">Select category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>{category.name}</option>
                      ))}
                    </select>
                  ) : null}
                </div>
                <button className="accent-btn" type="submit">Create campaign</button>
              </form>

              <form onSubmit={submitPlatformSettings} className="stack-form">
                <div className="form-grid">
                  <input
                    value={platformSettingsForm.tax_rate}
                    onChange={(event) => setPlatformSettingsForm((current) => ({ ...current, tax_rate: event.target.value }))}
                    placeholder="Tax rate"
                  />
                  <input
                    value={platformSettingsForm.free_shipping_threshold}
                    onChange={(event) => setPlatformSettingsForm((current) => ({ ...current, free_shipping_threshold: event.target.value }))}
                    placeholder="Free shipping threshold"
                  />
                  <input
                    className="field-span-2"
                    value={platformSettingsForm.support_email}
                    onChange={(event) => setPlatformSettingsForm((current) => ({ ...current, support_email: event.target.value }))}
                    placeholder="Support email"
                  />
                  <input
                    value={platformSettingsForm.default_return_window_days}
                    onChange={(event) => setPlatformSettingsForm((current) => ({ ...current, default_return_window_days: event.target.value }))}
                    placeholder="Return window days"
                  />
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={Boolean(platformSettingsForm.review_auto_publish)}
                      onChange={(event) => setPlatformSettingsForm((current) => ({ ...current, review_auto_publish: event.target.checked }))}
                    />
                    <span>Auto-publish verified reviews</span>
                  </label>
                </div>
                <button className="accent-btn" type="submit">Save settings</button>
              </form>
            </DashboardCard>
          </div>

          <DashboardCard title="Top Performing Products" copy="A quick merchandising view into what is currently carrying the catalog.">
            <div className="card-list">
              {(adminDashboard?.topProducts || []).map((product) => (
                <div className="list-row" key={`${product.name}-${product.rank_in_category}`}>
                  <span>
                    <strong>{product.name}</strong>
                    <small>{product.category_name} | rank #{product.rank_in_category}</small>
                  </span>
                  <span style={{ fontWeight: 700 }}>{product.units_sold} sold</span>
                </div>
              ))}
            </div>
          </DashboardCard>
        </div>
      ) : null}

      {activeTab === 'warehouses' && canManageWarehouses ? (
        <div className="dashboard-sections">
          <div className="stats-inline">
            <MetricPanel
              title="Warehouses"
              value={warehouseNetwork.length}
              detail={`${warehouseNetwork.filter((warehouse) => warehouse.is_active).length} active`}
            />
            <MetricPanel
              title="Utilized Units"
              value={warehouseNetwork.reduce((sum, warehouse) => sum + Number(warehouse.utilized_units || 0), 0).toLocaleString()}
              detail="Inventory currently allocated"
            />
            <MetricPanel
              title="Open Alerts"
              value={warehouseNetwork.reduce((sum, warehouse) => sum + Number(warehouse.alert_skus || 0), 0)}
              detail="Products at or below reorder point"
            />
          </div>

          <div className="feature-grid" style={{ gridTemplateColumns: '0.8fr 1.2fr' }}>
            <DashboardCard title="Create Warehouse" copy="Expand the fulfillment network with a new active warehouse.">
              <form onSubmit={submitWarehouse} className="stack-form">
                <div className="form-grid">
                  <input
                    value={warehouseForm.code}
                    onChange={(event) => setWarehouseForm((current) => ({ ...current, code: event.target.value }))}
                    placeholder="Code"
                  />
                  <input
                    value={warehouseForm.capacityUnits}
                    onChange={(event) => setWarehouseForm((current) => ({ ...current, capacityUnits: event.target.value }))}
                    placeholder="Capacity units"
                  />
                  <input
                    className="field-span-2"
                    value={warehouseForm.name}
                    onChange={(event) => setWarehouseForm((current) => ({ ...current, name: event.target.value }))}
                    placeholder="Warehouse name"
                  />
                  <input
                    value={warehouseForm.city}
                    onChange={(event) => setWarehouseForm((current) => ({ ...current, city: event.target.value }))}
                    placeholder="City"
                  />
                  <input
                    value={warehouseForm.country}
                    onChange={(event) => setWarehouseForm((current) => ({ ...current, country: event.target.value }))}
                    placeholder="Country"
                  />
                  <label className="checkbox-row field-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(warehouseForm.isActive)}
                      onChange={(event) => setWarehouseForm((current) => ({ ...current, isActive: event.target.checked }))}
                    />
                    <span>Warehouse is active immediately</span>
                  </label>
                </div>
                <button className="accent-btn" type="submit">Create warehouse</button>
              </form>
            </DashboardCard>

            <DashboardCard title="Warehouse Network" copy="Capacity, utilization, and stock-pressure visibility for every active node.">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Warehouse</th>
                      <th>Location</th>
                      <th>Utilization</th>
                      <th>Alerts</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {warehouseNetwork.map((warehouse) => (
                      <tr key={warehouse.id}>
                        <td>
                          <strong>{warehouse.name}</strong>
                          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>{warehouse.code}</small>
                        </td>
                        <td>{warehouse.city}, {warehouse.country}</td>
                        <td>
                          <strong>{warehouse.utilizationRate || warehouse.utilization_rate || 0}%</strong>
                          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>
                            {Number(warehouse.utilized_units || 0).toLocaleString()} / {Number(warehouse.capacity_units || 0).toLocaleString()}
                          </small>
                        </td>
                        <td>{warehouse.alert_skus || 0}</td>
                        <td>
                          <button
                            className="ghost-btn ghost-btn-small"
                            type="button"
                            onClick={() => toggleWarehouseStatus(warehouse)}
                          >
                            {warehouse.is_active ? 'Pause' : 'Activate'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === 'people' && canManagePeople ? (
        <div className="dashboard-sections">
          <div className="feature-grid" style={{ gridTemplateColumns: '0.85fr 1.15fr' }}>
            <DashboardCard title="Create Account" copy="Provision customer or staff accounts with role-aware access from the admin workspace.">
              <form onSubmit={submitManagedUser} className="stack-form">
                <div className="form-grid">
                  <input
                    className="field-span-2"
                    value={managedUserForm.fullName}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, fullName: event.target.value }))}
                    placeholder="Full name"
                  />
                  <input
                    className="field-span-2"
                    value={managedUserForm.email}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, email: event.target.value }))}
                    placeholder="Email address"
                  />
                  <input
                    className="field-span-2"
                    type="password"
                    value={managedUserForm.password}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, password: event.target.value }))}
                    placeholder="Strong password"
                  />
                  <select
                    value={managedUserForm.roleName}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, roleName: event.target.value }))}
                  >
                    <option value="customer">Customer</option>
                    <option value="admin">Admin</option>
                    <option value="operations_manager">Operations manager</option>
                    <option value="merchandising_manager">Merchandising manager</option>
                  </select>
                  <input
                    value={managedUserForm.phone}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Phone"
                  />
                  <input
                    value={managedUserForm.city}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, city: event.target.value }))}
                    placeholder="City"
                  />
                  <input
                    value={managedUserForm.country}
                    onChange={(event) => setManagedUserForm((current) => ({ ...current, country: event.target.value }))}
                    placeholder="Country"
                  />
                  {managedUserForm.roleName === 'customer' ? (
                    <input
                      className="field-span-2"
                      value={managedUserForm.companyName}
                      onChange={(event) => setManagedUserForm((current) => ({ ...current, companyName: event.target.value }))}
                      placeholder="Company name"
                    />
                  ) : null}
                  <label className="checkbox-row field-span-2">
                    <input
                      type="checkbox"
                      checked={Boolean(managedUserForm.isActive)}
                      onChange={(event) => setManagedUserForm((current) => ({ ...current, isActive: event.target.checked }))}
                    />
                    <span>Account is active immediately</span>
                  </label>
                </div>
                <button className="accent-btn" type="submit">Create account</button>
              </form>
            </DashboardCard>

            <DashboardCard title="People Directory" copy="Monitor role coverage, customer health, and access state across the platform team.">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Name</th>
                      <th>Role</th>
                      <th>Location</th>
                      <th>Value</th>
                      <th>Access</th>
                    </tr>
                  </thead>
                  <tbody>
                    {userDirectory.map((user) => (
                      <tr key={user.id}>
                        <td>
                          <strong>{user.full_name}</strong>
                          <small style={{ display: 'block', color: 'var(--ink-soft)' }}>{user.email}</small>
                        </td>
                        <td>{titleize(user.role_name)}</td>
                        <td>{[user.city, user.country].filter(Boolean).join(', ') || 'Not set'}</td>
                        <td>{user.role_name === 'customer' ? money(user.lifetime_value || 0) : formatDate(user.last_login_at)}</td>
                        <td>
                          <button
                            className="ghost-btn ghost-btn-small"
                            type="button"
                            onClick={() => toggleManagedUserStatus(user)}
                          >
                            {user.is_active ? 'Suspend' : 'Restore'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}

      {activeTab === 'rates' && canViewRates ? (
        <div className="dashboard-sections">
          <div className="stats-inline">
            <MetricPanel
              title="Provider"
              value={titleize(exchangeService?.provider || 'frankfurter')}
              detail={exchangeService?.enabled ? 'Hourly sync enabled' : 'Sync disabled'}
            />
            <MetricPanel
              title="Tracked Pairs"
              value={exchangeService?.pairCount || rateRows.length || 0}
              detail={`Latest effective ${formatDate(exchangeService?.latestEffectiveAt)}`}
            />
            <MetricPanel
              title="Last Run"
              value={titleize(exchangeService?.lastRun?.status || 'Pending')}
              detail={formatDate(exchangeService?.lastRun?.completed_at || exchangeService?.lastRun?.completedAt)}
            />
            <MetricPanel
              title="Sync Interval"
              value={`${Math.round(Number(exchangeService?.intervalMs || 0) / 3600000) || 1}h`}
              detail={exchangeService?.nextRunAt ? `Next ${formatDate(exchangeService.nextRunAt)}` : 'On demand'}
            />
          </div>

          <div className="feature-grid" style={{ gridTemplateColumns: '0.9fr 1.1fr' }}>
            <DashboardCard
              title="Exchange Service"
              copy="Run a manual sync, review audit history, and confirm the external provider is healthy."
              action={capabilities.canManageExchangeRates ? (
                <button className="accent-btn" type="button" onClick={refreshExchangeRateSync}>
                  Sync now
                </button>
              ) : null}
            >
              <div className="card-list">
                {(exchangeService?.recentRuns || []).map((run) => (
                  <div className="list-row" key={run.id || `${run.started_at}-${run.status}`}>
                    <span>
                      <strong>{titleize(run.status)}</strong>
                      <small>{titleize(run.trigger)} | {formatDate(run.completed_at || run.completedAt)}</small>
                    </span>
                    <span style={{ fontWeight: 700 }}>{run.summary || 'No summary'}</span>
                  </div>
                ))}
              </div>
            </DashboardCard>

            <DashboardCard title="Current Rates" copy="Latest currency pairs available to checkout and pricing analytics.">
              <div className="data-table-container">
                <table className="data-table">
                  <thead>
                    <tr>
                      <th>Pair</th>
                      <th>Rate</th>
                      <th>Updated</th>
                    </tr>
                  </thead>
                  <tbody>
                    {rateRows.slice(0, 12).map((rate) => (
                      <tr key={`${rate.from_currency_code}-${rate.to_currency_code}`}>
                        <td style={{ fontFamily: 'monospace' }}>{rate.from_currency_code} to {rate.to_currency_code}</td>
                        <td style={{ fontWeight: 700 }}>{Number(rate.rate || 0).toFixed(6)}</td>
                        <td>{formatDate(rate.effective_at)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </DashboardCard>
          </div>
        </div>
      ) : null}
    </section>
  );
};

export default DashboardPage;
