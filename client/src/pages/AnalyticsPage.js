import DashboardCard from '../components/DashboardCard';
import MetricPanel from '../components/MetricPanel';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';
import { money, formatDate } from '../lib/format';

/* ── Mini bar chart (pure CSS) ── */
const BarChart = ({ rows, valueKey = 'total_revenue_usd', labelKey = 'category_name', maxBars = 8 }) => {
  const data = rows.slice(0, maxBars);
  const max  = Math.max(...data.map((r) => Number(r[valueKey] || 0)), 1);
  return (
    <div className="bar-chart">
      {data.map((row) => {
        const val = Number(row[valueKey] || 0);
        const pct = Math.max(2, (val / max) * 100);
        return (
          <div className="bar-chart-row" key={row[labelKey] || row.category_id}>
            <span className="bar-chart-label">{row[labelKey]}</span>
            <div className="bar-chart-track">
              <div className="bar-chart-fill" style={{ width: `${pct}%` }} />
            </div>
            <span className="bar-chart-value">{money(val, 'USD')}</span>
          </div>
        );
      })}
    </div>
  );
};

/* ── Price delta badge ── */
const DeltaBadge = ({ direction, delta }) => {
  if (!direction || direction === 'initial') return <span className="delta-badge delta-neutral">—</span>;
  if (direction === 'increase') return <span className="delta-badge delta-up">▲ {money(Math.abs(delta))}</span>;
  if (direction === 'decrease') return <span className="delta-badge delta-down">▼ {money(Math.abs(delta))}</span>;
  return <span className="delta-badge delta-neutral">— unchanged</span>;
};

/* ── Rank medal ── */
const RankBadge = ({ rank }) => {
  if (rank === 1) return <span className="rank-badge rank-gold">#{rank}</span>;
  if (rank === 2) return <span className="rank-badge rank-silver">#{rank}</span>;
  if (rank === 3) return <span className="rank-badge rank-bronze">#{rank}</span>;
  return <span className="rank-badge rank-default">#{rank}</span>;
};

/* ── Tier colour ── */
const TIER_COLORS = {
  VIP: 'var(--price-color)',
  Premium: 'var(--link)',
  Standard: 'var(--ink-soft)',
};

const AnalyticsPage = ({ analyticsState, session, onNavigate }) => {
  if (!session || !['admin', 'operations_manager', 'merchandising_manager'].includes(session.roleName)) {
    return (
      <EmptyState
        title="Analytics access restricted"
        copy="Analytics reports are available to admin and operations staff only."
        action={
          <button className="accent-btn" type="button" onClick={() => onNavigate('dashboard')}>
            Go to Dashboard
          </button>
        }
      />
    );
  }

  if (analyticsState.status === 'loading') {
    return (
      <section className="section-shell">
        <LoadingSkeleton count={6} type="row" />
      </section>
    );
  }

  if (analyticsState.status === 'error') {
    return (
      <EmptyState
        title="Could not load analytics"
        copy="The analytics reports failed to load. Check the database connection."
        action={
          <button className="ghost-btn" type="button" onClick={() => onNavigate('dashboard')}>
            Back to dashboard
          </button>
        }
      />
    );
  }

  const {
    weeklyCategorySales = [],
    topProducts = [],
    customerTierMatrix = [],
    priceHistory = [],
    exchangeRates = [],
    inventoryHealth = [],
  } = analyticsState.data || {};

  /* ── KPI summary ── */
  const totalRevenue  = weeklyCategorySales.reduce((s, r) => s + Number(r.total_revenue_usd || 0), 0);
  const totalUnits    = weeklyCategorySales.reduce((s, r) => s + Number(r.units_sold || 0), 0);
  const totalOrders   = weeklyCategorySales.reduce((s, r) => s + Number(r.order_count || 0), 0);
  const alertCount    = inventoryHealth.filter((i) => ['out_of_stock', 'critical', 'low'].includes(i.stock_status)).length;
  const latestWeekRows = weeklyCategorySales.filter((r) => r.year_week === weeklyCategorySales[0]?.year_week);

  return (
    <section className="section-shell analytics-page">
      <div className="section-header" style={{ marginBottom: '1.5rem' }}>
        <div>
          <span className="section-eyebrow">Business Intelligence</span>
          <h1>Analytics Centre</h1>
          <p className="muted-copy">Advanced SQL reports using CTEs, window functions, and multi-warehouse aggregation.</p>
        </div>
        <button className="ghost-btn" type="button" onClick={() => onNavigate('inventory')}>
          Inventory Health
        </button>
      </div>

      {/* ── KPI Strip ── */}
      <div className="stats-inline analytics-kpi-strip">
        <MetricPanel
          title="Total Revenue (8 wks)"
          value={money(totalRevenue, 'USD')}
          detail={`Across ${weeklyCategorySales.length} category-week rows`}
        />
        <MetricPanel title="Units Sold" value={totalUnits.toLocaleString()} detail="All non-cancelled orders" />
        <MetricPanel title="Order Count" value={totalOrders.toLocaleString()} detail="Unique orders in period" />
        <MetricPanel
          title="Stock Alerts"
          value={alertCount}
          detail={`${inventoryHealth.filter((i) => i.stock_status === 'out_of_stock').length} out of stock`}
        />
        <MetricPanel title="Exchange Pairs" value={exchangeRates.length} detail="Active currency pairs" />
        <MetricPanel title="Top Product" value={topProducts[0]?.product_name?.split(' ').slice(0, 2).join(' ') || '—'} detail={topProducts[0] ? `${topProducts[0].total_sold} units sold` : ''} />
      </div>

      {/* ── Weekly Sales Chart ── */}
      <div className="feature-grid" style={{ marginTop: '1.5rem' }}>
        <DashboardCard
          title="Weekly Revenue by Category"
          copy="CTE + DATE_TRUNC('week') aggregation ranked by revenue per week."
        >
          {latestWeekRows.length > 0 ? (
            <>
              <p className="muted-copy" style={{ fontSize: 12, marginBottom: '0.75rem' }}>
                Latest week: <strong>{latestWeekRows[0]?.year_week}</strong>
              </p>
              <BarChart rows={latestWeekRows} valueKey="total_revenue_usd" labelKey="category_name" />
            </>
          ) : (
            <p className="muted-copy">No weekly data yet.</p>
          )}

          {weeklyCategorySales.length > 0 && (
            <div className="data-table-container" style={{ marginTop: '1rem', maxHeight: 280, overflowY: 'auto' }}>
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Week</th>
                    <th>Category</th>
                    <th>Revenue (USD)</th>
                    <th>Units</th>
                    <th>Orders</th>
                    <th>Rank</th>
                  </tr>
                </thead>
                <tbody>
                  {weeklyCategorySales.slice(0, 30).map((row, i) => (
                    <tr key={`${row.year_week}-${row.category_id}-${i}`}>
                      <td style={{ fontFamily: 'monospace', fontSize: 12 }}>{row.year_week}</td>
                      <td><strong>{row.category_name}</strong></td>
                      <td style={{ fontWeight: 700 }}>{money(row.total_revenue_usd, 'USD')}</td>
                      <td>{Number(row.units_sold).toLocaleString()}</td>
                      <td>{row.order_count}</td>
                      <td><RankBadge rank={Number(row.rank_in_week)} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </DashboardCard>

        {/* Exchange Rates */}
        <DashboardCard
          title="Exchange Rate Dashboard"
          copy="Latest rates with LAG()-computed % change from the previous effective rate."
        >
          <div className="card-list">
            {exchangeRates.slice(0, 12).map((rate) => {
              const pct = Number(rate.pct_change || 0);
              return (
                <div className="list-row" key={`${rate.from_currency_code}-${rate.to_currency_code}`}>
                  <span>
                    <strong style={{ fontFamily: 'monospace' }}>{rate.from_currency_code} → {rate.to_currency_code}</strong>
                    <small>{formatDate(rate.effective_at)}</small>
                  </span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                    <strong style={{ fontFamily: 'monospace' }}>{Number(rate.rate).toFixed(6)}</strong>
                    {rate.previous_rate && (
                      <span style={{ fontSize: 11, color: pct >= 0 ? 'var(--success)' : 'var(--danger)', fontWeight: 700 }}>
                        {pct >= 0 ? '▲' : '▼'} {Math.abs(pct).toFixed(3)}%
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </DashboardCard>
      </div>

      {/* ── Top Products ── */}
      <div style={{ marginTop: '1.5rem' }}>
        <DashboardCard
          title="Top Products by Category — RANK() Window Function"
          copy="Products ranked by total quantity sold within each category. Global rank via DENSE_RANK(), revenue grouping via NTILE(10)."
        >
          <div className="data-table-container">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Category</th>
                  <th>Cat. Rank</th>
                  <th>Global Rank</th>
                  <th>Units Sold</th>
                  <th>Revenue</th>
                  <th>Decile</th>
                </tr>
              </thead>
              <tbody>
                {topProducts.slice(0, 20).map((p) => (
                  <tr
                    key={p.product_id}
                    onClick={() => onNavigate('product', p.product_slug)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>
                      <button
                        className="inline-link"
                        type="button"
                        onClick={(e) => { e.stopPropagation(); onNavigate('product', p.product_slug); }}
                        style={{ fontWeight: 600, fontSize: 13 }}
                      >
                        {p.product_name}
                      </button>
                    </td>
                    <td><span className="category-pill" style={{ fontSize: 11 }}>{p.category_name}</span></td>
                    <td><RankBadge rank={Number(p.rank_in_category)} /></td>
                    <td style={{ fontFamily: 'monospace', fontSize: 12 }}>#{p.global_rank}</td>
                    <td style={{ fontWeight: 700 }}>{Number(p.total_sold).toLocaleString()}</td>
                    <td>{money(p.total_revenue)}</td>
                    <td>
                      <span style={{
                        fontSize: 11, fontWeight: 700,
                        color: p.revenue_decile <= 2 ? 'var(--success)' : p.revenue_decile >= 9 ? 'var(--danger)' : 'var(--ink-soft)',
                      }}>
                        D{p.revenue_decile}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>

      {/* ── Customer Tier Matrix ── */}
      <div className="feature-grid" style={{ marginTop: '1.5rem' }}>
        <DashboardCard
          title="Customer Tier Matrix — NTILE(10) + RANK()"
          copy="Customers ranked within tier, grouped into LTV deciles. Uses RANK() OVER PARTITION and NTILE()."
        >
          <div className="data-table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Customer</th>
                  <th>Tier</th>
                  <th>Rank in Tier</th>
                  <th>LTV Decile</th>
                  <th>Lifetime Value</th>
                  <th>Orders</th>
                  <th>Discount</th>
                </tr>
              </thead>
              <tbody>
                {customerTierMatrix.slice(0, 30).map((c) => (
                  <tr key={c.customer_id}>
                    <td>
                      <strong style={{ fontSize: 13 }}>{c.customer_name}</strong>
                      <small style={{ display: 'block', color: 'var(--ink-soft)', fontSize: 11 }}>{c.email}</small>
                    </td>
                    <td>
                      <span style={{ fontWeight: 700, color: TIER_COLORS[c.tier_name] || 'var(--ink)' }}>
                        {c.tier_name || 'Standard'}
                      </span>
                    </td>
                    <td><RankBadge rank={Number(c.rank_in_tier)} /></td>
                    <td>
                      <span style={{ fontSize: 11, fontWeight: 700, color: c.lifetime_value_decile <= 2 ? 'var(--success)' : 'var(--ink-soft)' }}>
                        D{c.lifetime_value_decile}
                      </span>
                    </td>
                    <td style={{ fontWeight: 700 }}>{money(c.lifetime_value)}</td>
                    <td>{c.total_orders}</td>
                    <td style={{ color: 'var(--success)', fontWeight: 700 }}>{c.discount_rate ? `${c.discount_rate}%` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </DashboardCard>

        {/* Price History */}
        <DashboardCard
          title="Price History — LAG() & LEAD()"
          copy="Product price changes over time using LAG() for previous price and directional delta."
        >
          <div className="data-table-container" style={{ maxHeight: 320, overflowY: 'auto' }}>
            <table className="data-table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>Date</th>
                  <th>New Price</th>
                  <th>Delta</th>
                  <th>Next Price</th>
                </tr>
              </thead>
              <tbody>
                {priceHistory.slice(0, 25).map((ph, i) => (
                  <tr key={`${ph.product_id}-${ph.changed_at}-${i}`}>
                    <td>
                      <button
                        className="inline-link"
                        type="button"
                        onClick={() => onNavigate('product', ph.product_slug)}
                        style={{ fontWeight: 600, fontSize: 12 }}
                      >
                        {ph.product_name}
                      </button>
                    </td>
                    <td style={{ fontSize: 11, fontFamily: 'monospace' }}>{formatDate(ph.changed_at)}</td>
                    <td style={{ fontWeight: 700 }}>{money(ph.new_price, ph.currency_code)}</td>
                    <td><DeltaBadge direction={ph.direction} delta={ph.price_delta} /></td>
                    <td style={{ color: 'var(--ink-soft)', fontSize: 12 }}>
                      {ph.lead_price ? money(ph.lead_price, ph.currency_code) : '—'}
                    </td>
                  </tr>
                ))}
                {priceHistory.length === 0 && (
                  <tr><td colSpan={5} style={{ textAlign: 'center', color: 'var(--ink-soft)', padding: '1rem' }}>No price history recorded yet.</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </DashboardCard>
      </div>
    </section>
  );
};

export default AnalyticsPage;
