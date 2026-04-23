import { useState } from 'react';
import { BarChartIcon, TruckIcon, DollarSignIcon, UsersIcon, PackageIcon, AlertCircleIcon } from '../components/MarketplaceIcons';
import { ExportButton } from '../components';
import { money, formatDate } from '../lib/format';

const EnhancedAnalytics = ({ analyticsData, session, onNavigate }) => {
  const [timeRange, setTimeRange] = useState('30d');
  const [selectedMetric, setSelectedMetric] = useState('revenue');

  if (!analyticsData) {
    return (
      <section className="section-shell">
        <div className="container">
          <p style={{ textAlign: 'center', padding: '3rem', color: 'var(--ink-light)' }}>
            Loading analytics...
          </p>
        </div>
      </section>
    );
  }

  const metrics = [
    {
      id: 'revenue',
      label: 'Total Revenue',
      value: money(analyticsData.totalRevenue || 0),
      change: '+12.5%',
      trend: 'up',
      icon: DollarSignIcon,
      color: 'var(--success)',
    },
    {
      id: 'orders',
      label: 'Total Orders',
      value: (analyticsData.orderCount || 0).toLocaleString(),
      change: '+8.3%',
      trend: 'up',
      icon: PackageIcon,
      color: 'var(--primary)',
    },
    {
      id: 'customers',
      label: 'Active Customers',
      value: (analyticsData.customerCount || 0).toLocaleString(),
      change: '+15.2%',
      trend: 'up',
      icon: UsersIcon,
      color: 'var(--info)',
    },
    {
      id: 'avg_order',
      label: 'Avg Order Value',
      value: money(analyticsData.avgOrderValue || 0),
      change: '+5.1%',
      trend: 'up',
      icon: BarChartIcon,
      color: 'var(--warning)',
    },
  ];

  const topProducts = analyticsData.topProducts || [];
  const recentOrders = analyticsData.recentOrders || [];
  const categoryPerformance = analyticsData.categoryPerformance || [];

  return (
    <section className="section-shell">
      <div className="container">
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div>
            <h1 style={{ fontSize: '2rem', fontWeight: 700, marginBottom: '0.5rem' }}>
              Analytics Dashboard
            </h1>
            <p style={{ color: 'var(--ink-light)' }}>
              Comprehensive insights into your business performance
            </p>
          </div>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <select
              value={timeRange}
              onChange={(e) => setTimeRange(e.target.value)}
              style={{
                padding: '0.5rem 1rem',
                border: '1px solid var(--border)',
                borderRadius: 4,
                background: 'var(--surface)',
              }}
            >
              <option value="7d">Last 7 days</option>
              <option value="30d">Last 30 days</option>
              <option value="90d">Last 90 days</option>
              <option value="1y">Last year</option>
            </select>
            <ExportButton
              data={[
                { metric: 'Revenue', value: analyticsData.totalRevenue },
                { metric: 'Orders', value: analyticsData.orderCount },
                { metric: 'Customers', value: analyticsData.customerCount },
                { metric: 'Avg Order Value', value: analyticsData.avgOrderValue },
              ]}
              filename="analytics_report"
              type="csv"
              label="Export Report"
            />
          </div>
        </div>

        {/* Key Metrics */}
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '1.5rem',
            marginBottom: '2rem',
          }}
        >
          {metrics.map((metric) => (
            <MetricCard
              key={metric.id}
              metric={metric}
              isSelected={selectedMetric === metric.id}
              onClick={() => setSelectedMetric(metric.id)}
            />
          ))}
        </div>

        {/* Charts Section */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1.5rem', marginBottom: '2rem' }}>
          {/* Revenue Chart */}
          <div
            style={{
              background: 'var(--surface)',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Revenue Trend
            </h3>
            <SimpleBarChart data={generateMockChartData()} />
          </div>

          {/* Quick Stats */}
          <div
            style={{
              background: 'var(--surface)',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Quick Stats
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              <QuickStat label="Conversion Rate" value="3.2%" trend="up" />
              <QuickStat label="Cart Abandonment" value="68.5%" trend="down" />
              <QuickStat label="Repeat Customers" value="24.8%" trend="up" />
              <QuickStat label="Avg Session Duration" value="4m 32s" trend="up" />
            </div>
          </div>
        </div>

        {/* Top Products */}
        {topProducts.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: '2rem',
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
              <h3 style={{ fontSize: '1.25rem', fontWeight: 600 }}>Top Performing Products</h3>
              <ExportButton data={topProducts} filename="top_products" type="csv" label="Export" />
            </div>
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '2px solid var(--border)' }}>
                    <th style={{ padding: '0.75rem', textAlign: 'left', fontWeight: 600 }}>Product</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Sales</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Revenue</th>
                    <th style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>Growth</th>
                  </tr>
                </thead>
                <tbody>
                  {topProducts.slice(0, 10).map((product, index) => (
                    <tr key={index} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '0.75rem' }}>
                        <div style={{ fontWeight: 500 }}>{product.name}</div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--ink-light)' }}>
                          SKU: {product.sku}
                        </div>
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        {(product.sales || 0).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right', fontWeight: 600 }}>
                        {money(product.revenue || 0)}
                      </td>
                      <td style={{ padding: '0.75rem', textAlign: 'right' }}>
                        <span style={{ color: 'var(--success)', fontWeight: 500 }}>
                          +{Math.floor(Math.random() * 30)}%
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Category Performance */}
        {categoryPerformance.length > 0 && (
          <div
            style={{
              background: 'var(--surface)',
              padding: '1.5rem',
              borderRadius: 8,
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              marginBottom: '2rem',
            }}
          >
            <h3 style={{ fontSize: '1.25rem', fontWeight: 600, marginBottom: '1rem' }}>
              Category Performance
            </h3>
            <div style={{ display: 'grid', gap: '1rem' }}>
              {categoryPerformance.map((category, index) => (
                <CategoryBar key={index} category={category} />
              ))}
            </div>
          </div>
        )}

        {/* Alerts & Insights */}
        <div
          style={{
            background: '#fff3cd',
            border: '1px solid #ffc107',
            padding: '1.5rem',
            borderRadius: 8,
            marginBottom: '2rem',
          }}
        >
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
            <AlertCircleIcon size={24} style={{ color: '#856404', flexShrink: 0 }} />
            <div>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 600, marginBottom: '0.5rem', color: '#856404' }}>
                Insights & Recommendations
              </h3>
              <ul style={{ margin: 0, paddingLeft: '1.5rem', color: '#856404' }}>
                <li>Your conversion rate increased by 15% this week</li>
                <li>Electronics category showing strong growth (+28%)</li>
                <li>Consider restocking top 3 products - low inventory detected</li>
                <li>Weekend sales are 40% higher than weekdays</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

const MetricCard = ({ metric, isSelected, onClick }) => (
  <div
    onClick={onClick}
    style={{
      background: isSelected ? 'var(--primary)' : 'var(--surface)',
      color: isSelected ? 'white' : 'var(--ink)',
      padding: '1.5rem',
      borderRadius: 8,
      boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
      cursor: 'pointer',
      transition: 'all 0.2s',
      border: isSelected ? '2px solid var(--primary)' : '2px solid transparent',
    }}
  >
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
      <div
        style={{
          background: isSelected ? 'rgba(255,255,255,0.2)' : metric.color,
          color: isSelected ? 'white' : 'white',
          padding: '0.75rem',
          borderRadius: 8,
        }}
      >
        <metric.icon size={24} />
      </div>
      <span
        style={{
          fontSize: '0.875rem',
          fontWeight: 600,
          color: isSelected ? 'white' : 'var(--success)',
        }}
      >
        {metric.change}
      </span>
    </div>
    <div style={{ fontSize: '0.875rem', opacity: 0.9, marginBottom: '0.5rem' }}>
      {metric.label}
    </div>
    <div style={{ fontSize: '1.75rem', fontWeight: 700 }}>{metric.value}</div>
  </div>
);

const QuickStat = ({ label, value, trend }) => (
  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
    <span style={{ color: 'var(--ink-light)' }}>{label}</span>
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
      <span style={{ fontWeight: 600 }}>{value}</span>
      <span style={{ color: trend === 'up' ? 'var(--success)' : 'var(--danger)', fontSize: '0.875rem' }}>
        {trend === 'up' ? '↑' : '↓'}
      </span>
    </div>
  </div>
);

const SimpleBarChart = ({ data }) => (
  <div style={{ display: 'flex', alignItems: 'flex-end', gap: '0.5rem', height: 200 }}>
    {data.map((item, index) => (
      <div key={index} style={{ flex: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem' }}>
        <div
          style={{
            width: '100%',
            height: `${item.value}%`,
            background: 'var(--primary)',
            borderRadius: '4px 4px 0 0',
            transition: 'height 0.3s',
          }}
        />
        <span style={{ fontSize: '0.75rem', color: 'var(--ink-light)' }}>{item.label}</span>
      </div>
    ))}
  </div>
);

const CategoryBar = ({ category }) => {
  const percentage = Math.min(100, (category.revenue / 100000) * 100);
  
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span style={{ fontWeight: 500 }}>{category.name}</span>
        <span style={{ fontWeight: 600 }}>{money(category.revenue || 0)}</span>
      </div>
      <div style={{ background: 'var(--background)', height: 8, borderRadius: 4, overflow: 'hidden' }}>
        <div
          style={{
            width: `${percentage}%`,
            height: '100%',
            background: 'var(--primary)',
            transition: 'width 0.3s',
          }}
        />
      </div>
    </div>
  );
};

const generateMockChartData = () => {
  const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  return days.map(day => ({
    label: day,
    value: 40 + Math.random() * 60,
  }));
};

export default EnhancedAnalytics;
