/**
 * App.jsx — PlantBot Root Component
 * ====================================
 * Layout: Header + Sidebar (trái) + Main Content (phải)
 * Main Content: Camera → Sensor Cards → Chart → Device Controls
 *
 * Tất cả hooks được khởi tạo ở đây và truyền xuống qua props.
 */

import { useState, useEffect, useRef } from 'react';
import { useSensorData } from './hooks/useSensorData';
import { usePumpControl } from './hooks/usePumpControl';
import { useFanControl } from './hooks/useFanControl';
import { useLedControl } from './hooks/useLedControl';
import { useCamera } from './hooks/useCamera';
import { useSystemInfo } from './hooks/useSystemInfo';

import { Sidebar } from './components/Sidebar/Sidebar';
import { CameraView } from './components/Camera/CameraView';
import { Dashboard } from './components/Dashboard/Dashboard';
import { PumpControl } from './components/Controls/PumpControl';
import { FanControl } from './components/Controls/FanControl';
import { LedControl } from './components/Controls/LedControl';
import { StatusBadge } from './components/common/StatusBadge';
import { GalleryModal } from './components/Gallery/GalleryModal';
import { SafeModeBanner } from './components/common/SafeModeBanner';

import { getExportUrl } from './api/client';
import './App.css';

export default function App() {
  // ─── Hooks ────────────────────────────────────
  const { sensorData, history, isConnected: wsConnected } = useSensorData();
  const { pumpOn, mistOn, togglePump, toggleMist, isLoading: pumpLoading } = usePumpControl(sensorData);
  const { fanOn, toggleFan, isLoading: fanLoading } = useFanControl(sensorData);
  const { ledOn, toggleLed, isLoading: ledLoading } = useLedControl(sensorData);
  const { cameras, aiConfig, toggleCamera, toggleAi, updateAiConfig, getStreamUrl, isActive, isAiActive, isLoading: camLoading } = useCamera();
  const { systemInfo, reconnect, isLoading: sysLoading } = useSystemInfo();

  const [showGallery, setShowGallery] = useState(false);
  const [logs, setLogs] = useState([]);
  const prevData = useRef(null);

  // ─── Logic Event Log Tracking ─────────────────
  useEffect(() => {
    if (!sensorData) return;

    const timeStr = new Date().toLocaleTimeString('vi-VN');

    // Lần đầu nhận dữ liệu
    if (!prevData.current) {
      prevData.current = sensorData;
      return;
    }

    const prev = prevData.current;
    const cur = sensorData;
    let newLog = null;

    // 1. Lỗi cảm biến (Sanity checks)
    if (!prev.safe_mode && cur.safe_mode) {
      let msg = 'Kích hoạt chế độ bảo vệ an toàn.';
      if (cur.error_code === 1) msg = 'Phát hiện lỗi Cảm biến DHT22 (Nhiệt độ/Độ ẩm). Đã ngắt phun sương và quạt chạy nền.';
      if (cur.error_code === 2) msg = 'Phát hiện lỗi Cảm biến Độ ẩm đất. Đã khóa hệ thống máy bơm nước.';
      newLog = { time: timeStr, type: 'sanity', message: msg };
    } 
    else if (prev.safe_mode && !cur.safe_mode) {
      newLog = { time: timeStr, type: 'recovery', message: 'Cảm biến đã hoạt động bình thường. Hệ thống tự động thoát Safe Mode.' };
    }

    // 2. Điều kiện cực đoan (Edge cases) - chỉ quan sát nếu không trong Safe Mode
    if (!cur.safe_mode) {
      if (prev.env_code !== cur.env_code) {
        if (cur.env_code === 1) {
          newLog = { time: timeStr, type: 'edgecase', message: 'Phát hiện Sốc nhiệt (> 40.0°C). Tự động bật quạt và phun sương tuần hoàn để làm mát.' };
        } else if (cur.env_code === 2) {
          newLog = { time: timeStr, type: 'edgecase', message: 'Phát hiện Úng khí (> 85.0% độ ẩm). Tự động ngắt phun sương và bật quạt để tản ẩm.' };
        } else if (cur.env_code === 0 && prev.env_code !== 0) {
          newLog = { time: timeStr, type: 'recovery', message: 'Điều kiện môi trường đã trở lại bình thường. Đã khôi phục các thiết bị về trạng thái tự động.' };
        }
      }
    }

    if (newLog) {
      setLogs((prevLogs) => {
        const nextLogs = [...prevLogs, newLog];
        return nextLogs.length > 50 ? nextLogs.slice(-50) : nextLogs;
      });
    }

    prevData.current = cur;
  }, [sensorData]);


  // ─── Handlers ─────────────────────────────────
  const handleExport = () => {
    window.open(getExportUrl(), '_blank');
  };

  const safeMode = sensorData?.safe_mode || false;
  const errorCode = sensorData?.error_code || 0;

  // ─── Render ───────────────────────────────────
  return (
    <div className="app-layout">
      {/* Header */}
      <header className="app-header">
        <div className="app-header__logo">
          <span className="app-header__logo-icon">🌿</span>
          <span>
            Plant<span className="app-header__logo-accent">Bot</span>
          </span>
          <StatusBadge
            status={wsConnected ? 'online' : 'offline'}
            label={wsConnected ? 'Live' : 'Offline'}
          />
        </div>

        <div className="app-header__actions">
          <button className="btn btn--sm" onClick={() => setShowGallery(true)}>
            🖼️ Ảnh Bệnh
          </button>
          <button className="btn btn--sm" onClick={handleExport}>
            📥 Export CSV
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className="app-sidebar">
        <Sidebar
          systemInfo={systemInfo}
          onReconnect={() => reconnect()}
          isLoading={sysLoading}
        />
      </div>

      {/* Main Content */}
      <main className="app-main">
        {/* Camera — đặt trên cùng */}
        <CameraView
          cameras={cameras}
          aiConfig={aiConfig}
          toggleCamera={toggleCamera}
          toggleAi={toggleAi}
          updateAiConfig={updateAiConfig}
          getStreamUrl={getStreamUrl}
          isActive={isActive}
          isAiActive={isAiActive}
          isLoading={camLoading}
        />

        {/* Cảnh báo an toàn (nếu có) */}
        <SafeModeBanner safeMode={safeMode} errorCode={errorCode} />

        {/* Sensor Cards + Chart */}
        <Dashboard
          sensorData={sensorData}
          history={history}
          logs={logs}
        />

        {/* Device Controls */}
        <div className="device-controls">
          <PumpControl
            pumpOn={pumpOn}
            mistOn={mistOn}
            togglePump={togglePump}
            toggleMist={toggleMist}
            isLoading={pumpLoading}
            safeMode={safeMode}
          />
          <FanControl
            fanOn={fanOn}
            toggleFan={toggleFan}
            isLoading={fanLoading}
            safeMode={safeMode}
          />
          <LedControl
            ledOn={ledOn}
            toggleLed={toggleLed}
            isLoading={ledLoading}
            safeMode={safeMode}
          />
        </div>
      </main>
      
      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal onClose={() => setShowGallery(false)} />
      )}
    </div>
  );
}
