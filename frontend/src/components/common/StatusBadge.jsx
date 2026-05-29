/**
 * StatusBadge.jsx — Badge trạng thái (online/offline/loading)
 * =============================================================
 * Reusable component hiển thị trạng thái kết nối.
 */

import './StatusBadge.css';

export function StatusBadge({ status = 'offline', label }) {
  return (
    <span className={`status-badge status-badge--${status}`}>
      <span className="status-badge__dot" />
      {label && <span className="status-badge__label">{label}</span>}
    </span>
  );
}
