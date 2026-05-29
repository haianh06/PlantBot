/**
 * CameraView.jsx — Camera Viewer (Multi-Camera)
 * ================================================
 * Hiển thị video stream từ 1 hoặc 2 camera cùng lúc.
 * Đặt ở khu vực main content (phía trên sensor cards).
 */

import { ToggleSwitch } from '../common/ToggleSwitch';
import './CameraView.css';

export function CameraView({ cameras, toggleCamera, getStreamUrl, isActive, isLoading }) {
  return (
    <div className="camera-view card animate-fade-in">
      <div className="card__header">
        <h2 className="card__title">
          <span>📷</span> Camera Giám Sát
        </h2>
        <div className="camera-view__toggles">
          {/* Toggle cho camera 0 (Laptop) */}
          <div className="camera-view__toggle-item">
            <ToggleSwitch
              checked={isActive(0)}
              onChange={() => toggleCamera(0)}
              disabled={isLoading[0]}
              label="Cam 1"
            />
          </div>
          {/* Toggle cho camera 1 (USB) */}
          <div className="camera-view__toggle-item">
            <ToggleSwitch
              checked={isActive(1)}
              onChange={() => toggleCamera(1)}
              disabled={isLoading[1]}
              label="Cam 2"
            />
          </div>
        </div>
      </div>

      <div className="card__body camera-view__body">
        {!isActive(0) && !isActive(1) ? (
          /* Không có camera nào đang bật */
          <div className="camera-view__placeholder">
            <span className="camera-view__placeholder-icon">📷</span>
            <p>Camera đang tắt</p>
            <p className="camera-view__placeholder-hint">
              Bật toggle phía trên để xem camera
            </p>
          </div>
        ) : (
          /* Hiển thị camera đang bật */
          <div className={`camera-view__streams ${isActive(0) && isActive(1) ? 'camera-view__streams--dual' : ''}`}>
            {isActive(0) && (
              <div className="camera-view__stream-item">
                <div className="camera-view__stream-label">
                  <span className="camera-view__live-dot" />
                  Camera 1 — Laptop
                </div>
                <img
                  src={getStreamUrl(0)}
                  alt="Camera 1 Stream"
                  className="camera-view__image"
                />
              </div>
            )}
            {isActive(1) && (
              <div className="camera-view__stream-item">
                <div className="camera-view__stream-label">
                  <span className="camera-view__live-dot" />
                  Camera 2 — USB
                </div>
                <img
                  src={getStreamUrl(1)}
                  alt="Camera 2 Stream"
                  className="camera-view__image"
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
