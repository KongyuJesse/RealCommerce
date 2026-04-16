import { useState } from 'react';
import DashboardCard from '../components/DashboardCard';
import MetricPanel from '../components/MetricPanel';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

const STOCK_STATUS_META = {
  out_of_stock: { label: 'Out of Stock',  color: 'var(--danger)',       icon: '●', urgent: true },
  critical:     { label: 'Critical',      color: '#c0392b',             icon: '●', urgent: true },
  low:          { label: 'Low Stock',     color: 'var(--accent-deep)',  icon: '●', urgent: false },
  healthy:      { label: 'Healthy',       color: 'var(--success)',      icon: '●', urgent: false },
  overstocked:  { label: 'Overstocked',   color: '#7f8c8d',             icon: '●', urgent: false },
};

const StockMeter = ({ pct, status }) => {
  const meta = STOCK_STATUS_META[status] || STOCK_STATUS_META.healthy;
  const safePct = Math.min(100, Math.max(0, Number(pct || 0)));
  return (
    <div className="stock-meter" title={`${safePct}% of reorder point`}>
      <div
        className="stock-meter-fill"
        style={{ width: `${safePct}%`, background: meta.color }}
      />
    </div>
  );
};

const InventoryPage = ({ inventoryState, session, onNavigate, submitReorder }) => {
  const [activeWarehouse, setActiveWarehouse] = useState('all');
  const [filterStatus, setFilterStatus]       = useState('all');

  if (!session || !['admin', 'operations_manager'].includes(session.roleName)) {
    return (
      <EmptyState
        title="Inventory access restricted"
        copy="Inventory management is available to admin and operations staff only."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('dashboard')}>
            Go to Dashboard
          </button>
        }
      />
    );
  }

  if (inventoryState.status === 'loading') {
    return (
      <section className="section-shell">
        <LoadingSkeleton count={8} type="row" />
      </section>
    );
  }

  const rows = inventoryState.data || [];

  /* Derived */
  const warehouses   = [...new Set(rows.map((r) => r.warehouse_name))].sort();
  const outOfStock   = rows.filter((r) => r.stock_status === 'out_of_stock').length;
  const critical     = rows.filter((r) => r.stock_status === 'critical').length;
  const low          = rows.filter((r) => r.stock_status === 'low').length;
  const healthy      = rows.filter((r) => r.stock_status === 'healthy').length;
  const overstocked  = rows.filter((r) => r.stock_status === 'overstocked').length;

  const displayed = rows.filter((r) => {
    const wOk = activeWarehouse === 'all' || r.warehouse_name === activeWarehouse;
    const sOk = filterStatus   === 'all' || r.stock_status   === filterStatus;
    return wOk && sOk;
  });

  return (
    <section className="section-shell inventory-page">
      <div className="section-header">
        <div>
          <span className="section-eyebrow">Operations</span>
          <h1>Inventory Management</h1>
          <p className="muted-copy">
            Multi-warehouse stock levels with automated low-stock detection and reorder queue.
          </p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('analytics')}>
          Analytics
        </button>
      </div>

      {/* KPI Strip */}
      <div className="stats-inline" style={{ marginBottom: '1.5rem' }}>
        <MetricPanel title="SKU–Warehouse Pairs" value={rows.length} detail="Total tracked positions" />
        <MetricPanel title="Out of Stock"  value={outOfStock}  detail="Requires immediate action" />
        <MetricPanel title="Critical"      value={critical}    detail="Below safety stock" />
        <MetricPanel title="Low Stock"     value={low}         detail="Below reorder point" />
        <MetricPanel title="Healthy"       value={healthy}     detail="Normal operating range" />
        <MetricPanel title="Overstocked"   value={overstocked} detail="3× above reorder point" />
      </div>

      {/* Warehouse Tabs */}
      <nav className="dashboard-tabs" aria-label="Warehouse filter">
        {['all', ...warehouses].map((wh) => (
          <button
            key={wh}
            className={`dashboard-tab ${activeWarehouse === wh ? 'is-active' : ''}`}
            type="button"
            onClick={() => setActiveWarehouse(wh)}
          >
            {wh === 'all' ? `All Warehouses (${rows.length})` : wh}
          </button>
        ))}
      </nav>

      {/* Status Filter */}
      <div className="filter-row" style={{ margin: '1rem 0' }}>
        <span className="muted-copy">{displayed.length} positions shown</span>
        <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap' }}>
          {['all', 'out_of_stock', 'critical', 'low', 'healthy', 'overstocked'].map((s) => {
            const meta = s === 'all' ? null : STOCK_STATUS_META[s];
            return (
              <button
                key={s}
                className={`filter-chip ${filterStatus === s ? 'is-active' : ''}`}
                type="button"
                onClick={() => setFilterStatus(s)}
                style={filterStatus === s && meta ? { borderColor: meta.color, color: meta.color } : {}}
              >
                {meta ? `${meta.icon} ${meta.label}` : 'All Status'}
              </button>
            );
          })}
        </div>
      </div>

      {/* Inventory Table */}
      <DashboardCard title="Stock Positions" copy="Click 'Request Reorder' on low-stock items to queue a reorder request.">
        {displayed.length === 0 ? (
          <p className="muted-copy" style={{ padding: '1rem 0' }}>No inventory positions match the current filter.</p>
        ) : (
          <div className="data-table-container">
            <table className="data-table inventory-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Warehouse</th>
                  <th>On Hand</th>
                  <th>Reorder Point</th>
                  <th>Safety Stock</th>
                  <th>Stock Level</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {displayed.map((row) => {
                  const meta = STOCK_STATUS_META[row.stock_status] || STOCK_STATUS_META.healthy;
                  return (
                    <tr key={row.inventory_id} className={meta.urgent ? 'row-urgent' : ''}>
                      <td>
                        <button
                          className="inline-link"
                          type="button"
                          onClick={() => onNavigate('product', row.product_slug)}
                          style={{ fontWeight: 600, fontSize: 13 }}
                        >
                          {row.product_name}
                        </button>
                      </td>
                      <td><span className="category-pill" style={{ fontSize: 11 }}>{row.category_name}</span></td>
                      <td style={{ fontSize: 12 }}>{row.warehouse_name}</td>
                      <td>
                        <strong style={{ color: row.quantity_on_hand <= 0 ? 'var(--danger)' : 'var(--ink)' }}>
                          {row.quantity_on_hand}
                        </strong>
                      </td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.reorder_point}</td>
                      <td style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{row.safety_stock}</td>
                      <td style={{ minWidth: 100 }}>
                        <StockMeter pct={row.stock_pct} status={row.stock_status} />
                        <small style={{ fontSize: 10, color: 'var(--ink-soft)' }}>{row.stock_pct}%</small>
                      </td>
                      <td>
                        <span style={{ fontSize: 12, fontWeight: 700, color: meta.color }}>
                          {meta.icon} {meta.label}
                        </span>
                      </td>
                      <td>
                        {(['out_of_stock', 'critical', 'low'].includes(row.stock_status)) && (
                          <button
                            className="ghost-btn ghost-btn-small"
                            type="button"
                            onClick={() => submitReorder && submitReorder(row)}
                            style={{ fontSize: 12 }}
                          >
                            Request Reorder
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </DashboardCard>
    </section>
  );
};

export default InventoryPage;
