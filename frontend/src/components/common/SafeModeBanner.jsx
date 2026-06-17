import './SafeModeBanner.css';

export function SafeModeBanner({ safeMode, errorCode }) {
  if (!safeMode) return null;

  let errorMessage = 'Lỗi không xác định';
  if (errorCode === 1) errorMessage = 'Phát hiện lỗi Cảm biến DHT22 (Nhiệt độ/Độ ẩm). Đã ngắt phun sương và quạt chạy nền.';
  if (errorCode === 2) errorMessage = 'Phát hiện lỗi Cảm biến Độ ẩm đất. Đã khóa hệ thống máy bơm nước.';
  if (errorCode === 3) errorMessage = 'Phát hiện độ ẩm đất quá cao (>85%). Đã ngắt và khóa hệ thống máy bơm để phòng chống ngập úng.';

  return (
    <div className="safe-mode-banner">
      <div className="safe-mode-banner__icon">⚠️</div>
      <div className="safe-mode-banner__content">
        <h3 className="safe-mode-banner__title">Hệ thống đang trong chế độ an toàn (Fail-Safe)</h3>
        <p className="safe-mode-banner__desc">{errorMessage}</p>
        <p className="safe-mode-banner__help">Các chức năng điều khiển thủ công đã bị khóa. Vui lòng kiểm tra phần cứng hoặc khởi động lại hệ thống.</p>
      </div>
    </div>
  );
}
