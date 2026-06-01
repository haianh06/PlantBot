/**
 * PumpControl.jsx — Điều khiển Máy Bơm, Phun Sương & Quạt
 * ==========================================================
 * 3 card song song: Bơm nước + Phun sương + Quạt thông gió
 * Mỗi card có: trạng thái + nút toggle lớn
 */

import './PumpControl.css';

function DeviceCard({ icon, name, isOn, onToggle, isLoading, onLabel, offLabel }) {
  return (
<<<<<<< HEAD
    <>
      {/* Máy bơm nước */}
      <div className={`pump-control__card card ${pumpOn ? 'pump-control__card--active' : ''}`}>
        <div className="pump-control__icon">💧</div>
        <h3 className="pump-control__name">Máy Bơm Nước</h3>
=======
    <div className={`pump-control__card card ${isOn ? 'pump-control__card--active' : ''}`}>
      <div className="pump-control__icon">{icon}</div>
      <h3 className="pump-control__name">{name}</h3>
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c

      <div className="pump-control__status">
        <span className={`pump-control__dot ${isOn ? 'pump-control__dot--on' : 'pump-control__dot--off'}`} />
        <span>{isOn ? 'Đang bật' : 'Đang tắt'}</span>
      </div>

<<<<<<< HEAD
      {/* Phun sương */}
      <div className={`pump-control__card card ${mistOn ? 'pump-control__card--active' : ''}`}>
        <div className="pump-control__icon">🌫️</div>
        <h3 className="pump-control__name">Phun Sương</h3>

        <div className="pump-control__status">
          <span className={`pump-control__dot ${mistOn ? 'pump-control__dot--on' : 'pump-control__dot--off'}`} />
          <span>{mistOn ? 'Đang bật' : 'Đang tắt'}</span>
        </div>

        <button
          className={`pump-control__button ${mistOn ? 'pump-control__button--on' : 'pump-control__button--off'}`}
          onClick={toggleMist}
          disabled={isLoading?.mist}
        >
          {isLoading?.mist ? (
            <span className="spinner" />
          ) : (
            mistOn ? 'Tắt Sương' : 'Bật Sương'
          )}
        </button>
      </div>
    </>
=======
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

export function PumpControl({ pumpOn, mistOn, fanOn, togglePump, toggleMist, toggleFan, isLoading }) {
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
      <DeviceCard
        icon="🌀"
        name="Quạt Thông Gió"
        isOn={fanOn}
        onToggle={toggleFan}
        isLoading={isLoading?.fan}
        onLabel="Bật Quạt"
        offLabel="Tắt Quạt"
      />
    </div>
>>>>>>> ed819e82b4960937cfd5629b9427b0064b70af3c
  );
}
