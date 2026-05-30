/**
 * App.jsx — PlantBot Root Component
 * ====================================
 * Layout: Header + Sidebar (trái) + Main Content (phải)
 * Main Content: Camera → Sensor Cards → Chart → Pump Controls
 *
 * Tất cả hooks được khởi tạo ở đây và truyền xuống qua props.
 */

import { useSensorData } from './hooks/useSensorData';
import { usePumpControl } from './hooks/usePumpControl';
import { useCamera } from './hooks/useCamera';
import { useSystemInfo } from './hooks/useSystemInfo';

import { Sidebar } from './components/Sidebar/Sidebar';
import { CameraView } from './components/Camera/CameraView';
import { Dashboard } from './components/Dashboard/Dashboard';
import { PumpControl } from './components/Controls/PumpControl';
import { StatusBadge } from './components/common/StatusBadge';

import { getExportUrl } from './api/client';
import './App.css';

export default function App() {
  // ─── Hooks ────────────────────────────────────
  const { sensorData, history, isConnected: wsConnected } = useSensorData();
  const { pumpOn, mistOn, togglePump, toggleMist, isLoading: pumpLoading } = usePumpControl(sensorData);
  const { cameras, toggleCamera, getStreamUrl, isActive, isLoading: camLoading, diseaseStatus } = useCamera();
  const { systemInfo, reconnect, isLoading: sysLoading } = useSystemInfo();

  // ─── Handlers ─────────────────────────────────
  const handleExport = () => {
    window.open(getExportUrl(), '_blank');
  };

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
          toggleCamera={toggleCamera}
          getStreamUrl={getStreamUrl}
          isActive={isActive}
          isLoading={camLoading}
          diseaseStatus={diseaseStatus}
        />

        {/* Sensor Cards + Chart */}
        <Dashboard
          sensorData={sensorData}
          history={history}
        />

        {/* Pump Controls */}
        <PumpControl
          pumpOn={pumpOn}
          mistOn={mistOn}
          togglePump={togglePump}
          toggleMist={toggleMist}
          isLoading={pumpLoading}
        />
      </main>
    </div>
  );
}
