/**
 * CameraView.jsx — Camera Viewer (Multi-Camera + AI Disease Detection)
 * =====================================================================
 * Hiển thị video stream từ 1 hoặc 2 camera cùng lúc.
 * Camera 2 (USB) tích hợp AI phát hiện bệnh cây với bounding boxes
 * hiển thị trực tiếp trên stream + badge trạng thái bệnh.
 */

import { useState } from 'react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import './CameraView.css';

export function CameraView({ cameras, toggleCamera, getStreamUrl, isActive, isLoading, diseaseStatus }) {
  const [maximizedCam, setMaximizedCam] = useState(null);

  const handleToggleMaximize = (index) => {
    setMaximizedCam(maximizedCam === index ? null : index);
  };

  // Render disease status badge cho Camera 2
  const renderDiseaseBadge = () => {
    if (!diseaseStatus || !diseaseStatus.is_active) return null;

    const isDiseased = diseaseStatus.label === 'Diseased';
    const badgeClass = isDiseased
      ? 'camera-view__disease-badge--diseased'
      : 'camera-view__disease-badge--healthy';

    const labelText = isDiseased ? 'Có bệnh' : 'Khỏe mạnh';
    const icon = isDiseased ? '🔴' : '🟢';

    return (
      <div className={`camera-view__disease-badge ${badgeClass}`}>
        <span className="camera-view__disease-icon">{icon}</span>
        <span className="camera-view__disease-label">{labelText}</span>
        <span className="camera-view__disease-conf">
          {diseaseStatus.confidence}%
        </span>
      </div>
    );
  };

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
                <button
                  className="camera-view__expand-btn"
                  onClick={() => handleToggleMaximize(0)}
                  title="Phóng to Camera 1"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
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
                  {renderDiseaseBadge()}
                </div>
                <button
                  className="camera-view__expand-btn"
                  onClick={() => handleToggleMaximize(1)}
                  title="Phóng to Camera 2"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  >
                    <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                  </svg>
                </button>
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

      {/* Fullscreen Zoom Modal */}
      {maximizedCam !== null && (
        <div className="camera-modal" onClick={() => setMaximizedCam(null)}>
          <div className="camera-modal__content" onClick={(e) => e.stopPropagation()}>
            <div className="camera-modal__header">
              <h3 className="camera-modal__title">
                <span className="camera-view__live-dot" />
                {maximizedCam === 0 ? 'Camera 1 — Laptop' : 'Camera 2 — USB'} (Góc Rộng HD)
                {maximizedCam === 1 && renderDiseaseBadge()}
              </h3>
              <button className="camera-modal__close" onClick={() => setMaximizedCam(null)}>
                &times;
              </button>
            </div>
            <div className="camera-modal__body">
              <img
                src={getStreamUrl(maximizedCam)}
                alt={`Camera ${maximizedCam + 1} Phóng To`}
                className="camera-modal__image"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
