/**
 * FanControl.jsx — Điều khiển quạt
 * =====================================================
 * Mỗi card có: trạng thái + nút toggle lớn
 */

import './FanControl.css';

export function FanControl({ fanOn, mistOn, toggleFan, toggleMist, isLoading }) {
  return (
    <>
      {/* Máy bơm nước */}
      <div className={`fan-control__card card ${fanOn ? 'fan-control__card--active' : ''}`}>
        <div className="fan-control__icon">🍃</div>
        <h3 className="fan-control__name">Quạt</h3>

        <div className="fan-control__status">
          <span className={`fan-control__dot ${fanOn ? 'fan-control__dot--on' : 'fan-control__dot--off'}`} />
          <span>{fanOn ? 'Đang bật' : 'Đang tắt'}</span>
        </div>

        <button
          className={`fan-control__button ${fanOn ? 'fan-control__button--on' : 'fan-control__button--off'}`}
          onClick={toggleFan}
          disabled={isLoading?.fan}
        >
          {isLoading?.fan ? (
            <span className="spinner" />
          ) : (
            fanOn ? 'Tắt Quạt' : 'Bật Quạt'
          )}
        </button>
      </div>
    </>
  );
}
