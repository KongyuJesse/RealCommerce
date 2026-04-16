import { statusLabel } from '../lib/format';

const StatusPill = ({ value }) => {
  const status = String(value || '').toLowerCase();
  return (
    <span className={`status-pill status-pill-${status}`}>
      {statusLabel(value)}
    </span>
  );
};

export default StatusPill;
