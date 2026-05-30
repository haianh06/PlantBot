/**
 * App.jsx — PlantBot Root Component
 * ====================================
 * Layout: Header + Sidebar (trái) + Main Content (phải)
 * Main Content: Camera → Sensor Cards → Chart → Device Controls → Scheduler
 *
 * Tất cả hooks được khởi tạo ở đây và truyền xuống qua props.
 */

import { useSensorData } from './hooks/useSensorData';
import { usePumpControl } from './hooks/usePumpControl';
import { useCamera } from './hooks/useCamera';
import { useSystemInfo } from './hooks/useSystemInfo';
import { useScheduler } from './hooks/useScheduler';

import { Sidebar } from './components/Sidebar/Sidebar';
import { CameraView } from './components/Camera/CameraView';
import { Dashboard } from './components/Dashboard/Dashboard';
import { PumpControl } from './components/Controls/PumpControl';
import { SchedulerPanel } from './components/Controls/SchedulerPanel';
import { StatusBadge } from './components/common/StatusBadge';

import { getExportUrl } from './api/client';
import './App.css';

export default function App() {
  // ─── Hooks ────────────────────────────────────
  const { sensorData, history, isConnected: wsConnected } = useSensorData();
  const { pumpOn, mistOn, fanOn, togglePump, toggleMist, toggleFan, isLoading: pumpLoading } = usePumpControl(sensorData);
  const { cameras, toggleCamera, getStreamUrl, isActive, isLoading: camLoading, diseaseStatus } = useCamera();
  const { systemInfo, reconnect, isLoading: sysLoading } = useSystemInfo();
  const { schedules, addSchedule, removeSchedule, toggleSchedule, isLoading: schedLoading } = useScheduler();

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

        {/* Device Controls: Bơm + Sương + Quạt */}
        <PumpControl
          pumpOn={pumpOn}
          mistOn={mistOn}
          fanOn={fanOn}
          togglePump={togglePump}
          toggleMist={toggleMist}
          toggleFan={toggleFan}
          isLoading={pumpLoading}
        />

        {/* Hẹn Giờ */}
        <SchedulerPanel
          schedules={schedules}
          onAdd={addSchedule}
          onRemove={removeSchedule}
          onToggle={toggleSchedule}
          isLoading={schedLoading}
        />
      </main>
    </div>
  );
}
