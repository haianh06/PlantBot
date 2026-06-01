/**
 * PumpControl.jsx — Điều khiển Máy Bơm & Phun Sương
 * =====================================================
 * 2 card song song: Bơm nước + Phun sương
 * Mỗi card có: trạng thái + nút toggle lớn
 */

import './PumpControl.css';

export function PumpControl({ pumpOn, mistOn, togglePump, toggleMist, isLoading }) {
  return (
    <>
      {/* Máy bơm nước */}
      <div className={`pump-control__card card ${pumpOn ? 'pump-control__card--active' : ''}`}>
        <div className="pump-control__icon">💧</div>
        <h3 className="pump-control__name">Máy Bơm Nước</h3>

        <div className="pump-control__status">
          <span className={`pump-control__dot ${pumpOn ? 'pump-control__dot--on' : 'pump-control__dot--off'}`} />
          <span>{pumpOn ? 'Đang bật' : 'Đang tắt'}</span>
        </div>

        <button
          className={`pump-control__button ${pumpOn ? 'pump-control__button--on' : 'pump-control__button--off'}`}
          onClick={togglePump}
          disabled={isLoading?.pump}
        >
          {isLoading?.pump ? (
            <span className="spinner" />
          ) : (
            pumpOn ? 'Tắt Bơm' : 'Bật Bơm'
          )}
        </button>
      </div>

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
  );
}
