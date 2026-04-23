import { useEffect, useState } from 'react';
import { ShieldIcon, UserIcon, PackageIcon, TruckIcon, DollarSignIcon, BarChartIcon, UsersIcon } from '../components/MarketplaceIcons';
import StatusPill from '../components/StatusPill';
import { buildApiUrl } from '../lib';
import { formatDate, money } from '../lib/format';

const STAFF_API_BASE = '/api/x7k9m';

const StaffPortalPage = ({ onNavigate }) => {
  const [staff, setStaff] = useState(null);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [dashboard, setDashboard] = useState(null);
  const [activeTab, setActiveTab] = useState('overview');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const staffApiUrl = (path) => buildApiUrl(`${STAFF_API_BASE}${path}`);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(staffApiUrl('/auth/login'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Login failed');
      setStaff(data.staff);
      loadDashboard();
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await fetch(staffApiUrl('/auth/logout'), { method: 'POST', credentials: 'include' });
    setStaff(null);
    setDashboard(null);
    setLoginForm({ email: '', password: '' });
  };

  const loadDashboard = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(staffApiUrl('/dashboard'), { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to load dashboard');
      const data = await res.json();
      setDashboard(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    let active = true;

    const checkSession = async () => {
      try {
        const res = await fetch(staffApiUrl('/auth/session'), { credentials: 'include' });
        if (!res.ok || !active) {
          return;
        }

        const data = await res.json();
        if (!active) {
          return;
        }

        setStaff(data);
        await loadDashboard();
      } catch (_error) {
        // Ignore anonymous session checks.
      }
    };

    checkSession();

    return () => {
      active = false;
    };
    // buildApiUrl is derived from static environment config and does not change at runtime.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  if (!staff) {
    return (
      <section className="section-shell" style={{ minHeight: '80vh', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <div style={{ maxWidth: 420, width: '100%', padding: '0 1rem' }}>
          <div style={{ textAlign: 'center', marginBottom: '2rem' }}>
            <ShieldIcon size={48} style={{ color: 'var(--primary)', marginBottom: '1rem' }} />
            <h1 style={{ fontSize: '1.75rem', fontWeight: 700, marginBottom: '0.5rem' }}>Staff Portal</h1>
            <p style={{ color: 'var(--ink-light)' }}>Secure access for RealCommerce staff</p>
          </div>
          <form onSubmit={handleLogin} style={{ background: 'var(--surface)', padding: '2rem', borderRadius: 8, boxShadow: '0 2px 8px rgba(0,0,0,0.08)' }}>
            {error && <div style={{ padding: '0.75rem', background: '#fee', color: '#c00', borderRadius: 4, marginBottom: '1rem', fontSize: '0.9rem' }}>{error}</div>}
            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Email</label>
              <input
                type="email"
                value={loginForm.email}
                onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                placeholder="staff@realcommerce.com"
                required
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, fontSize: '1rem' }}
              />
            </div>
            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', fontWeight: 600, marginBottom: '0.5rem' }}>Password</label>
              <input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Enter password"
                required
                style={{ width: '100%', padding: '0.75rem', border: '1px solid var(--border)', borderRadius: 4, fontSize: '1rem' }}
              />
            </div>
            <button type="submit" disabled={loading} className="btn-primary" style={{ width: '100%', padding: '0.875rem', fontSize: '1rem' }}>
              {loading ? 'Signing in...' : 'Sign In'}
            </button>
          </form>
          <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
            <button onClick={() => onNavigate('home')} style={{ color: 'var(--primary)', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline' }}>
              Back to homepage
            </button>
          </div>
        </div>
      </section>
    );
  }

  const caps = staff.capabilities || {};
  const role = staff.roleLabel || staff.roleName;

  const handleUpdateOrderStatus = async (orderId, status) => {
    try {
      const res = await fetch(staffApiUrl(`/orders/${orderId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update order');
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUpdateShipmentStatus = async (shipmentId, status) => {
    try {
      const res = await fetch(staffApiUrl(`/shipments/${shipmentId}/status`), {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ status }),
      });
      if (!res.ok) throw new Error('Failed to update shipment');
      loadDashboard();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSyncExchangeRates = async () => {
    setLoading(true);
    try {
      const res = await fetch(staffApiUrl('/exchange-rates/sync'), {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({ force: true }),
      });
      if (!res.ok) throw new Error('Sync failed');
      loadDashboard();
    } catch (err) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="section-shell" style={{ minHeight: '80vh' }}>
      <div style={{ background: 'var(--primary)', color: 'white', padding: '1.5rem 0' }}>
        <div className="container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <h1 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '0.25rem' }}>Staff Portal</h1>
            <p style={{ opacity: 0.9 }}>{staff.fullName} • {role}</p>
          </div>
          <button onClick={handleLogout} className="btn-secondary" style={{ background: 'white', color: 'var(--primary)' }}>
            Sign Out
          </button>
        </div>
      </div>

      <div className="container" style={{ marginTop: '2rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', borderBottom: '2px solid var(--border)', marginBottom: '2rem', flexWrap: 'wrap' }}>
          <TabButton active={activeTab === 'overview'} onClick={() => setActiveTab('overview')} icon={BarChartIcon}>Overview</TabButton>
          {caps.canManageCatalog && <TabButton active={activeTab === 'catalog'} onClick={() => setActiveTab('catalog')} icon={PackageIcon}>Catalog</TabButton>}
          {caps.canManageOperations && <TabButton active={activeTab === 'operations'} onClick={() => setActiveTab('operations')} icon={TruckIcon}>Operations</TabButton>}
          {caps.canManageWarehouses && <TabButton active={activeTab === 'warehouses'} onClick={() => setActiveTab('warehouses')} icon={PackageIcon}>Warehouses</TabButton>}
          {caps.canManagePeople && <TabButton active={activeTab === 'users'} onClick={() => setActiveTab('users')} icon={UsersIcon}>Users</TabButton>}
          {caps.canManageFinance && <TabButton active={activeTab === 'finance'} onClick={() => setActiveTab('finance')} icon={DollarSignIcon}>Finance</TabButton>}
          {caps.canViewSupport && <TabButton active={activeTab === 'support'} onClick={() => setActiveTab('support')} icon={UserIcon}>Support</TabButton>}
        </div>

        {loading && <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-light)' }}>Loading dashboard data...</div>}
        {error && <div style={{ padding: '1rem', background: '#fee', color: '#c00', borderRadius: 4, marginBottom: '1rem' }}>{error}</div>}

        {!loading && dashboard && (
          <>
            {activeTab === 'overview' && <OverviewTab dashboard={dashboard} staff={staff} />}
            {activeTab === 'catalog' && caps.canManageCatalog && <CatalogTab dashboard={dashboard} />}
            {activeTab === 'operations' && caps.canManageOperations && <OperationsTab dashboard={dashboard} onUpdateOrder={handleUpdateOrderStatus} onUpdateShipment={handleUpdateShipmentStatus} />}
            {activeTab === 'warehouses' && caps.canManageWarehouses && <WarehousesTab dashboard={dashboard} />}
            {activeTab === 'users' && caps.canManagePeople && <UsersTab dashboard={dashboard} />}
            {activeTab === 'finance' && caps.canManageFinance && <FinanceTab dashboard={dashboard} onSyncRates={handleSyncExchangeRates} />}
            {activeTab === 'support' && caps.canViewSupport && <SupportTab dashboard={dashboard} />}
          </>
        )}
      </div>
    </section>
  );
};

const TabButton = ({ active, onClick, icon: Icon, children }) => (
  <button
    onClick={onClick}
    style={{
      padding: '0.75rem 1.25rem',
      background: 'none',
      border: 'none',
      borderBottom: active ? '3px solid var(--primary)' : '3px solid transparent',
      color: active ? 'var(--primary)' : 'var(--ink-light)',
      fontWeight: active ? 600 : 400,
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '0.5rem',
    }}
  >
    <Icon size={18} />
    {children}
  </button>
);

const OverviewTab = ({ dashboard, staff }) => {
  const adminData = dashboard.admin || {};
  const opsData = dashboard.ops || {};
  const activity = dashboard.activity || [];

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Welcome, {staff.fullName}</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        {adminData.totalRevenue !== undefined && <StatCard label="Total Revenue" value={money(adminData.totalRevenue || 0)} />}
        {adminData.totalOrders !== undefined && <StatCard label="Total Orders" value={(adminData.totalOrders || 0).toLocaleString()} />}
        {adminData.activeProducts !== undefined && <StatCard label="Active Products" value={(adminData.activeProducts || 0).toLocaleString()} />}
        {adminData.totalCustomers !== undefined && <StatCard label="Total Customers" value={(adminData.totalCustomers || 0).toLocaleString()} />}
        {opsData.pendingOrders !== undefined && <StatCard label="Pending Orders" value={(opsData.pendingOrders || 0).toLocaleString()} />}
        {opsData.activeShipments !== undefined && <StatCard label="Active Shipments" value={(opsData.activeShipments || 0).toLocaleString()} />}
      </div>
      {activity && activity.length > 0 && (
        <div style={{ marginTop: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Activity</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
            {activity.slice(0, 15).map((act, i) => (
              <div key={i} style={{ padding: '1rem', borderBottom: i < 14 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 600, marginBottom: '0.25rem' }}>{act.summary}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>
                  {act.actor_name || act.actor_role} • {act.action} • {formatDate(act.created_at)}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const CatalogTab = ({ dashboard }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Catalog Management</h2>
    {dashboard.admin && (
      <div style={{ marginBottom: '1.5rem' }}>
        <StatCard label="Active Products" value={(dashboard.admin.activeProducts || 0).toLocaleString()} />
      </div>
    )}
    <p style={{ color: 'var(--ink-light)' }}>Use the main dashboard to create and manage products.</p>
  </div>
);

const OperationsTab = ({ dashboard, onUpdateOrder, onUpdateShipment }) => {
  const opsData = dashboard.ops || {};
  const shipments = dashboard.shipments || [];
  const reorderQueue = dashboard.reorderQueue || [];

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Operations Management</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Pending Orders" value={(opsData.pendingOrders || 0).toLocaleString()} />
        <StatCard label="Processing" value={(opsData.processingOrders || 0).toLocaleString()} />
        <StatCard label="Shipped" value={(opsData.shippedOrders || 0).toLocaleString()} />
        <StatCard label="Active Shipments" value={(opsData.activeShipments || 0).toLocaleString()} />
      </div>

      {shipments.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Active Shipments</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Tracking</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Order</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Carrier</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {shipments.slice(0, 20).map((ship, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace', fontSize: '0.9rem' }}>{ship.tracking_number}</td>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{ship.order_number}</td>
                    <td style={{ padding: '1rem' }}><StatusPill value={ship.status || ship.shipment_status} /></td>
                    <td style={{ padding: '1rem' }}>{ship.carrier || 'N/A'}</td>
                    <td style={{ padding: '1rem' }}>
                      <select
                        onChange={(e) => e.target.value && onUpdateShipment(ship.id, e.target.value)}
                        defaultValue=""
                        style={{ padding: '0.4rem', fontSize: '0.875rem', borderRadius: 4, border: '1px solid var(--border)' }}
                      >
                        <option value="">Update...</option>
                        <option value="PACKED">Packed</option>
                        <option value="IN_TRANSIT">In Transit</option>
                        <option value="DELIVERED">Delivered</option>
                      </select>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {reorderQueue && reorderQueue.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>Reorder Queue</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, padding: '1rem' }}>
            {reorderQueue.map((req, i) => (
              <div key={i} style={{ padding: '0.75rem 0', borderBottom: i < reorderQueue.length - 1 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{req.product_name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>
                  {req.warehouse_name} • On hand: {req.quantity_on_hand} • Reorder: {req.reorder_point}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const WarehousesTab = ({ dashboard }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Warehouse Management</h2>
    {dashboard.warehouses && dashboard.warehouses.length > 0 ? (
      <div style={{ display: 'grid', gap: '1rem' }}>
        {dashboard.warehouses.map((wh) => (
          <div key={wh.id} style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8 }}>
            <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem' }}>{wh.name}</h3>
            <p style={{ color: 'var(--ink-light)', marginBottom: '0.5rem' }}>{wh.code} • {wh.city}, {wh.country}</p>
            <p style={{ fontSize: '0.875rem' }}>Capacity: {wh.capacity_units?.toLocaleString()} units • Status: {wh.is_active ? 'Active' : 'Inactive'}</p>
          </div>
        ))}
      </div>
    ) : (
      <p style={{ color: 'var(--ink-light)' }}>No warehouses configured yet.</p>
    )}
  </div>
);

const UsersTab = ({ dashboard }) => (
  <div>
    <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>User Management</h2>
    {dashboard.customers && dashboard.customers.length > 0 ? (
      <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
        {dashboard.customers.slice(0, 20).map((user, i) => (
          <div key={i} style={{ padding: '1rem', borderBottom: i < 19 ? '1px solid var(--border)' : 'none' }}>
            <div style={{ fontWeight: 600 }}>{user.full_name}</div>
            <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>{user.email} • {user.role_name}</div>
          </div>
        ))}
      </div>
    ) : (
      <p style={{ color: 'var(--ink-light)' }}>No users to display.</p>
    )}
  </div>
);

const FinanceTab = ({ dashboard, onSyncRates }) => {
  const analytics = dashboard.analytics || {};
  const exchangeRates = dashboard.exchangeRates || [];
  const syncStatus = dashboard.syncStatus || {};

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Finance & Analytics</h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '2rem' }}>
        <StatCard label="Total Revenue" value={money(analytics.totalRevenue || 0)} />
        <StatCard label="Avg Order Value" value={money(analytics.avgOrderValue || 0)} />
        <StatCard label="Orders (30d)" value={(analytics.orderCount || 0).toLocaleString()} />
      </div>

      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
          <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Exchange Rates</h3>
          <button onClick={onSyncRates} className="btn-primary" style={{ padding: '0.5rem 1rem', fontSize: '0.875rem' }}>
            Sync Now
          </button>
        </div>
        <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, marginBottom: '1rem' }}>
          <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)', marginBottom: '0.25rem' }}>Last Sync</div>
              <div style={{ fontWeight: 600 }}>{syncStatus.lastSyncAt ? formatDate(syncStatus.lastSyncAt) : 'Never'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)', marginBottom: '0.25rem' }}>Status</div>
              <div style={{ fontWeight: 600 }}>{syncStatus.status || 'Unknown'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)', marginBottom: '0.25rem' }}>Pairs</div>
              <div style={{ fontWeight: 600 }}>{syncStatus.pairCount || exchangeRates.length || 0}</div>
            </div>
          </div>
        </div>
        {exchangeRates.length > 0 && (
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>From</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>To</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Rate</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Updated</th>
                </tr>
              </thead>
              <tbody>
                {exchangeRates.slice(0, 20).map((rate, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{rate.from_currency_code}</td>
                    <td style={{ padding: '1rem', fontFamily: 'monospace' }}>{rate.to_currency_code}</td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{Number(rate.rate).toFixed(6)}</td>
                    <td style={{ padding: '1rem', fontSize: '0.875rem' }}>{formatDate(rate.effective_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

const SupportTab = ({ dashboard }) => {
  const recentOrders = dashboard.recentOrders || [];
  const customers = dashboard.customers || [];

  return (
    <div>
      <h2 style={{ fontSize: '1.5rem', fontWeight: 700, marginBottom: '1.5rem' }}>Customer Support</h2>
      {recentOrders.length > 0 && (
        <div style={{ marginBottom: '2rem' }}>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Orders</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Order</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Customer</th>
                  <th style={{ padding: '1rem', textAlign: 'left', fontWeight: 600 }}>Status</th>
                  <th style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>Amount</th>
                </tr>
              </thead>
              <tbody>
                {recentOrders.map((order, i) => (
                  <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                    <td style={{ padding: '1rem', fontWeight: 600 }}>{order.order_number}</td>
                    <td style={{ padding: '1rem' }}>{order.customer_name}</td>
                    <td style={{ padding: '1rem' }}><StatusPill value={order.order_status} /></td>
                    <td style={{ padding: '1rem', textAlign: 'right', fontWeight: 600 }}>{money(order.total_amount, order.currency_code)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
      {customers.length > 0 && (
        <div>
          <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '1rem' }}>Recent Customers</h3>
          <div style={{ background: 'var(--surface)', borderRadius: 8, overflow: 'hidden' }}>
            {customers.slice(0, 15).map((cust, i) => (
              <div key={i} style={{ padding: '1rem', borderBottom: i < 14 ? '1px solid var(--border)' : 'none' }}>
                <div style={{ fontWeight: 600 }}>{cust.full_name}</div>
                <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>{cust.email}</div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

const StatCard = ({ label, value }) => (
  <div style={{ background: 'var(--surface)', padding: '1.5rem', borderRadius: 8, boxShadow: '0 1px 3px rgba(0,0,0,0.08)' }}>
    <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)', marginBottom: '0.5rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{label}</div>
    <div style={{ fontSize: '2rem', fontWeight: 700, color: 'var(--primary)' }}>{value}</div>
  </div>
);

export default StaffPortalPage;
