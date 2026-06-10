/**
 * App.jsx — PlantBot Root Component
 * ====================================
 * Layout: Header + Sidebar (trái) + Main Content (phải)
 * Main Content: Camera → Sensor Cards → Chart → Device Controls
 *
 * Tất cả hooks được khởi tạo ở đây và truyền xuống qua props.
 */

import { useState } from 'react';
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
