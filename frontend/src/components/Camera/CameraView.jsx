/**
 * CameraView.jsx — Camera Viewer (Multi-Camera)
 * =====================================================================
 * Hiển thị video stream từ 1 hoặc 2 camera cùng lúc.
 */

import { useState, useEffect } from 'react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import './CameraView.css';

export function CameraView({ cameras, aiConfig, toggleCamera, toggleAi, updateAiConfig, getStreamUrl, isActive, isAiActive, isLoading }) {
  const [maximizedCam, setMaximizedCam] = useState(null);
  const [showAiSettings, setShowAiSettings] = useState(false);
  const [localN, setLocalN] = useState(60);
  const [localM, setLocalM] = useState(10);

  useEffect(() => {
    if (aiConfig) {
      setLocalN(aiConfig.interval_n);
      setLocalM(aiConfig.duration_m);
    }
  }, [aiConfig]);

  const handleToggleMaximize = (index) => {
    setMaximizedCam(maximizedCam === index ? null : index);
  };
  
  const handleSaveAiConfig = () => {
    updateAiConfig(localN, localM);
    setShowAiSettings(false);
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
                <div className="camera-view__stream-label" style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span className="camera-view__live-dot" />
                    Camera 2 — USB
                  </div>
                  <div style={{ width: '1px', height: '16px', backgroundColor: 'rgba(255,255,255,0.2)' }} />
                  <div className="camera-view__ai-toggle" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}>
                    <span style={{ fontSize: '0.75rem' }}>AI</span>
                    <ToggleSwitch
                      checked={isAiActive(1)}
                      onChange={() => toggleAi(1)}
                      disabled={isLoading['ai_1']}
                    />
                    <button 
                      className="btn btn--icon" 
                      style={{ padding: '4px', background: 'transparent', border: '1px solid rgba(255,255,255,0.2)', marginLeft: '4px' }}
                      onClick={() => setShowAiSettings(!showAiSettings)}
                      title="Cài đặt AI Scanner"
                    >
                      ⚙️
                    </button>
                    {showAiSettings && (
                      <div className="camera-view__ai-settings card" style={{
                        position: 'absolute', 
                        top: '110%', 
                        left: '0', 
                        zIndex: 10, 
                        padding: '12px',
                        background: 'var(--surface-color)',
                        border: '1px solid var(--border-color)',
                        boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                        minWidth: '200px'
                      }}>
                        <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem' }}>Cấu hình AI Scanner</h4>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
                          <span style={{ fontSize: '0.8rem' }}>Nghỉ (s):</span>
                          <input 
                            type="number" 
                            style={{ width: '60px', padding: '4px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            value={localN} 
                            onChange={(e) => setLocalN(Number(e.target.value))} 
                          />
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                          <span style={{ fontSize: '0.8rem' }}>Quét (s):</span>
                          <input 
                            type="number" 
                            style={{ width: '60px', padding: '4px', background: 'var(--bg-color)', color: 'white', border: '1px solid var(--border-color)', borderRadius: '4px' }}
                            value={localM} 
                            onChange={(e) => setLocalM(Number(e.target.value))} 
                          />
                        </div>
                        <button className="btn btn--sm" style={{ width: '100%', justifyContent: 'center' }} onClick={handleSaveAiConfig}>Lưu</button>
                      </div>
                    )}
                  </div>
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
