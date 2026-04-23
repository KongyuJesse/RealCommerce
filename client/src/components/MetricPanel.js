const MetricPanel = ({ title, value, detail }) => (
  <article className="metric-panel premium-lift">
    <span className="metric-title">{title}</span>
    <strong className="metric-value">{value}</strong>
    {detail ? <small className="metric-detail">{detail}</small> : null}
  </article>
);

export default MetricPanel;
