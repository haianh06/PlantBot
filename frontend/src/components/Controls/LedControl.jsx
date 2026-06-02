/**
 * LedControl.jsx — Điều khiển đèn
 * =====================================================
 * Card có: trạng thái + nút toggle lớn
 */

import './LedControl.css';

export function LedControl({ ledOn, toggleLed, isLoading }) {
  return (
    <>
      {/* Đèn */}
      <div className={`led-control__card card ${ledOn ? 'led-control__card--active' : ''}`}>
        <div className="led-control__icon">💡</div>
        <h3 className="led-control__name">Đèn</h3>

        <div className="led-control__status">
          <span className={`led-control__dot ${ledOn ? 'led-control__dot--on' : 'led-control__dot--off'}`} />
          <span>{ledOn ? 'Đang bật' : 'Đang tắt'}</span>
        </div>

        <button
          className={`led-control__button ${ledOn ? 'led-control__button--on' : 'led-control__button--off'}`}
          onClick={toggleLed}
          disabled={isLoading?.led}
        >
          {isLoading?.led ? (
            <span className="spinner" />
          ) : (
            ledOn ? 'Tắt Đèn' : 'Bật Đèn'
          )}
        </button>
      </div>
    </>
  );
}
