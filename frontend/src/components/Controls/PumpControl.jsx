/**
 * PumpControl.jsx — Điều khiển Máy Bơm & Phun Sương
 * =====================================================
 * 2 card song song: Bơm nước + Phun sương
 * Mỗi card có: trạng thái + nút toggle lớn
 */

import './PumpControl.css';

function DeviceCard({ icon, name, isOn, onToggle, isLoading, onLabel, offLabel }) {
  return (
    <div className={`pump-control__card card ${isOn ? 'pump-control__card--active' : ''}`}>
      <div className="pump-control__icon">{icon}</div>
      <h3 className="pump-control__name">{name}</h3>

      <div className="pump-control__status">
        <span className={`pump-control__dot ${isOn ? 'pump-control__dot--on' : 'pump-control__dot--off'}`} />
        <span>{isOn ? 'Đang bật' : 'Đang tắt'}</span>
      </div>

      <button
        className={`pump-control__button ${isOn ? 'pump-control__button--on' : 'pump-control__button--off'}`}
        onClick={onToggle}
        disabled={isLoading}
      >
        {isLoading ? (
          <span className="spinner" />
        ) : (
          isOn ? offLabel : onLabel
        )}
      </button>
    </div>
  );
}

export function PumpControl({ pumpOn, mistOn, togglePump, toggleMist, isLoading }) {
  return (
    <div className="pump-control animate-fade-in">
      <DeviceCard
        icon="💧"
        name="Máy Bơm Nước"
        isOn={pumpOn}
        onToggle={togglePump}
        isLoading={isLoading?.pump}
        onLabel="Bật Bơm"
        offLabel="Tắt Bơm"
      />
      <DeviceCard
        icon="🌫️"
        name="Phun Sương"
        isOn={mistOn}
        onToggle={toggleMist}
        isLoading={isLoading?.mist}
        onLabel="Bật Sương"
        offLabel="Tắt Sương"
      />
    </div>
  );
}
