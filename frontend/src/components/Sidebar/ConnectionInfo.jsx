/**
 * ConnectionInfo.jsx — Thông tin kết nối Serial
 * ================================================
 * Hiển thị: COM port, baudrate, trạng thái, available ports.
 */

import { StatusBadge } from '../common/StatusBadge';

export function ConnectionInfo({ systemInfo, onReconnect, isLoading }) {
  const { serial_port, is_connected, baudrate, available_ports } = systemInfo;

  return (
    <div className="connection-info">
      {/* Trạng thái kết nối */}
      <div className="connection-info__row">
        <span className="connection-info__label">Trạng thái</span>
        <StatusBadge
          status={is_connected ? 'online' : 'offline'}
          label={is_connected ? 'Online' : 'Offline'}
        />
      </div>

      {/* COM Port */}
      <div className="connection-info__row">
        <span className="connection-info__label">Cổng</span>
        <span className="connection-info__value">{serial_port || '—'}</span>
      </div>

      {/* Baudrate */}
      <div className="connection-info__row">
        <span className="connection-info__label">Baudrate</span>
        <span className="connection-info__value">{baudrate}</span>
      </div>

      {/* Phương thức */}
      <div className="connection-info__row">
        <span className="connection-info__label">Phương thức</span>
        <span className="connection-info__value">USB Serial</span>
      </div>

      {/* Available ports */}
      {available_ports?.length > 0 && (
        <div className="connection-info__ports">
          <span className="connection-info__label">Cổng khả dụng</span>
          <div className="connection-info__port-list">
            {available_ports.map((port) => (
              <span
                key={port}
                className={`connection-info__port-tag ${port === serial_port ? 'connection-info__port-tag--active' : ''}`}
              >
                {port}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Nút Reconnect */}
      {!is_connected && (
        <button
          className="btn btn--primary btn--sm connection-info__reconnect"
          onClick={onReconnect}
          disabled={isLoading}
        >
          {isLoading ? <span className="spinner" /> : '🔄 Kết nối lại'}
        </button>
      )}
    </div>
  );
}
