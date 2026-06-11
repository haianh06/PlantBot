import { ConnectionInfo } from './ConnectionInfo';
import './Sidebar.css';

export function Sidebar({ 
  systemInfo, 
  onReconnect, 
  isLoading,
  autoMode,
  growthPreset,
  onToggleAutoMode,
  onPresetChange
}) {
  return (
    <aside className="sidebar">
      {/* Section: Chăm Sóc Tự Động */}
      <div className="sidebar__section">
        <h3 className="section-title">🤖 Chăm Sóc Tự Động</h3>
        <div className="automation-settings">
          {/* Master Toggle */}
          <div className="automation-setting-row">
            <span className="setting-label">Chế độ tự động</span>
            <label className="ml-switch">
              <input
                type="checkbox"
                checked={autoMode}
                onChange={(e) => onToggleAutoMode(e.target.checked)}
              />
              <span className="ml-switch__slider"></span>
            </label>
          </div>

          {/* Preset Selector */}
          <div className="automation-setting-row">
            <span className="setting-label">Preset gieo trồng</span>
            <select 
              className="preset-select"
              value={growthPreset}
              onChange={(e) => onPresetChange(e.target.value)}
            >
              <option value="baby">Cải thìa non (25 ngày)</option>
              <option value="mature">Cải thìa già (35 ngày)</option>
              <option value="custom">Tùy chọn số ngày</option>
            </select>
          </div>
        </div>
      </div>

      <div className="sidebar__divider" />

      {/* Section: Kết nối */}
      <div className="sidebar__section">
        <h3 className="section-title">📡 Kết nối Arduino</h3>
        <ConnectionInfo
          systemInfo={systemInfo}
          onReconnect={onReconnect}
          isLoading={isLoading}
        />
      </div>
    </aside>
  );
}
