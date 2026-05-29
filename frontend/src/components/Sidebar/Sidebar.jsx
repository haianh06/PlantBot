/**
 * Sidebar.jsx — Sidebar: Kết nối + Calibration
 * ================================================
 * Section 1: Thông tin kết nối Serial
 * Section 2: Calibration cảm biến
 */

import { ConnectionInfo } from './ConnectionInfo';
import { CalibrationPanel } from '../Settings/CalibrationPanel';
import './Sidebar.css';

export function Sidebar({ systemInfo, onReconnect, isLoading }) {
  return (
    <aside className="sidebar">
      {/* Section: Kết nối */}
      <div className="sidebar__section">
        <h3 className="section-title">📡 Kết nối Arduino</h3>
        <ConnectionInfo
          systemInfo={systemInfo}
          onReconnect={onReconnect}
          isLoading={isLoading}
        />
      </div>

      <div className="sidebar__divider" />

      {/* Section: Calibration */}
      <div className="sidebar__section">
        <h3 className="section-title">⚙️ Calibration</h3>
        <CalibrationPanel />
      </div>
    </aside>
  );
}
