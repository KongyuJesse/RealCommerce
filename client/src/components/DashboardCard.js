const DashboardCard = ({ title, copy, action, children }) => (
  <article className="panel-card" style={{ padding: '1.25rem', marginBottom: 0, height: '100%', display: 'flex', flexDirection: 'column' }}>
    <div className="panel-card-head" style={{ marginBottom: title ? '1rem' : 0 }}>
      <div>
        {title && <h3 style={{ fontSize: '1.25rem', color: '#0F1111', fontWeight: 700, margin: 0 }}>{title}</h3>}
        {copy ? <p style={{ color: '#565959', fontSize: '0.85rem', marginTop: '0.25rem' }}>{copy}</p> : null}
      </div>
      {action ? <div className="panel-card-action">{action}</div> : null}
    </div>
    <div className="panel-card-content" style={{ flexGrow: 1 }}>
      {children}
    </div>
  </article>

);

export default DashboardCard;
