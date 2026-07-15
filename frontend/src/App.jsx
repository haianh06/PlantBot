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
import { CalendarPanel } from './components/Dashboard/CalendarPanel';
import { SystemLogs } from './components/Dashboard/SystemLogs';
import { NewBatchPanel } from './components/Settings/NewBatchPanel';
import AlertNotification from './components/common/AlertNotification';

import { getExportUrl, fetchAutoMode, updateAutoMode, updatePreset } from './api/client';
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
  const [autoMode, setAutoMode] = useState(true);
  const [growthPreset, setGrowthPreset] = useState('mature');
  const [activeTab, setActiveTab] = useState('dashboard');
  const [confirmOverride, setConfirmOverride] = useState({ show: false, device: null, action: null, exec: null });
  const prevData = useRef(null);
  const manualActionTimeouts = useRef({ pump: 0, mist: 0, fan: 0, led: 0 });

  // Load auto mode and preset configs
  useEffect(() => {
    fetchAutoMode()
      .then((data) => {
        setAutoMode(data.auto_mode);
        setGrowthPreset(data.growth_preset);
      })
      .catch((err) => console.error("Lỗi lấy cấu hình auto mode:", err));
  }, []);

  const handleToggleAutoMode = (enabled) => {
    updateAutoMode(enabled)
      .then((data) => setAutoMode(data.auto_mode))
      .catch((err) => console.error("Lỗi cập nhật auto mode:", err));
  };

  const handlePresetChange = (preset) => {
    updatePreset(preset)
      .then((data) => {
        setGrowthPreset(data.preset);
        window.location.reload();
      })
      .catch((err) => console.error("Lỗi cập nhật preset:", err));
  };

  // Wrappers to track human manual triggers & confirm manual override warning
  const handleTogglePump = () => {
    if (autoMode) {
      setConfirmOverride({
        show: true,
        device: 'pump',
        action: pumpOn ? 'tắt' : 'bật',
        exec: () => {
          manualActionTimeouts.current.pump = Date.now();
          togglePump();
        }
      });
    } else {
      manualActionTimeouts.current.pump = Date.now();
      togglePump();
    }
  };

  const handleToggleMist = () => {
    if (autoMode) {
      setConfirmOverride({
        show: true,
        device: 'mist',
        action: mistOn ? 'tắt' : 'bật',
        exec: () => {
          manualActionTimeouts.current.mist = Date.now();
          toggleMist();
        }
      });
    } else {
      manualActionTimeouts.current.mist = Date.now();
      toggleMist();
    }
  };

  const handleToggleFan = () => {
    if (autoMode) {
      setConfirmOverride({
        show: true,
        device: 'fan',
        action: fanOn ? 'tắt' : 'bật',
        exec: () => {
          manualActionTimeouts.current.fan = Date.now();
          toggleFan();
        }
      });
    } else {
      manualActionTimeouts.current.fan = Date.now();
      toggleFan();
    }
  };

  const handleToggleLed = () => {
    if (autoMode) {
      setConfirmOverride({
        show: true,
        device: 'led',
        action: ledOn ? 'tắt' : 'bật',
        exec: () => {
          manualActionTimeouts.current.led = Date.now();
          toggleLed();
        }
      });
    } else {
      manualActionTimeouts.current.led = Date.now();
      toggleLed();
    }
  };

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
    let newLogs = [];

    const isHumanAction = (device) => {
      const lastTime = manualActionTimeouts.current[device];
      return (Date.now() - lastTime) < 4000;
    };

    // 1. Lỗi cảm biến (Sanity checks)
    if (!prev.safe_mode && cur.safe_mode) {
      let msg = 'Kích hoạt chế độ bảo vệ an toàn.';
      if (cur.error_code === 1) msg = 'Phát hiện lỗi Cảm biến DHT22 (Nhiệt độ/Độ ẩm). Đã ngắt phun sương và quạt chạy nền.';
      if (cur.error_code === 2) msg = 'Phát hiện lỗi Cảm biến Độ ẩm đất. Đã khóa hệ thống máy bơm nước.';
      if (cur.error_code === 3) msg = 'Phát hiện đất quá ẩm (>85%). Đã khóa hệ thống máy bơm gốc để phòng ngập úng.';
      newLogs.push({ time: timeStr, type: 'sanity', message: msg });
    } 
    else if (prev.safe_mode && !cur.safe_mode) {
      newLogs.push({ time: timeStr, type: 'recovery', message: 'Hệ thống đã hoạt động bình thường trở lại. Giải phóng Safe Mode.' });
    }

    // 2. Mất kết nối PC (Offline Failsafe)
    if (!prev.offline && cur.offline) {
      newLogs.push({ time: timeStr, type: 'sanity', message: 'Mất kết nối với PC (Timeout 60s). Hệ thống tự kích hoạt chế độ Failsafe ngoại tuyến.' });
    }
    else if (prev.offline && !cur.offline) {
      newLogs.push({ time: timeStr, type: 'recovery', message: 'Đã khôi phục kết nối với PC Backend. Đã trả quyền điều khiển tự động.' });
    }

    // 3. Đất khô hạn (Độ ẩm < 45%) - Trường hợp cực đoan
    if (prev.soil_moisture !== undefined && cur.soil_moisture !== undefined) {
      if (prev.soil_moisture >= 45 && cur.soil_moisture < 45) {
        newLogs.push({
          time: timeStr,
          type: 'edgecase',
          message: `Độ ẩm đất thấp dưới ngưỡng an toàn (hiện tại: ${cur.soil_moisture}%). Cần cấp nước.`
        });
      } else if (prev.soil_moisture < 45 && cur.soil_moisture >= 45) {
        newLogs.push({
          time: timeStr,
          type: 'recovery',
          message: `Độ ẩm đất đã được khôi phục về mức an toàn (hiện tại: ${cur.soil_moisture}%).`
        });
      }
    }

    // 4. Điều kiện cực đoan (Edge cases) - chỉ quan sát nếu không trong Safe Mode
    if (!cur.safe_mode) {
      if (prev.env_code !== cur.env_code) {
        if (cur.env_code === 1) {
          newLogs.push({ time: timeStr, type: 'edgecase', message: 'Phát hiện Sốc nhiệt (> 40.0°C). Tự động bật quạt và phun sương tuần hoàn để làm mát.' });
        } else if (cur.env_code === 2) {
          newLogs.push({ time: timeStr, type: 'edgecase', message: 'Phát hiện Úng khí (> 85.0% độ ẩm). Tự động ngắt phun sương và bật quạt để tản ẩm.' });
        } else if (cur.env_code === 0 && prev.env_code !== 0) {
          newLogs.push({ time: timeStr, type: 'recovery', message: 'Điều kiện môi trường đã trở lại bình thường. Đã khôi phục các thiết bị về trạng thái tự động.' });
        }
      }
    }

    // 5. Hoạt động tự động (không có can thiệp của con người)
    // --- Máy bơm ---
    if (prev.pump_on !== cur.pump_on && !isHumanAction('pump')) {
      if (cur.pump_on) {
        let msg = 'Tự động kích hoạt máy bơm nước.';
        if (cur.offline) {
          msg = 'Chế độ ngoại tuyến: Tự động tưới duy trì sự sống (20 giây).';
        } else if (cur.soil_moisture < 45) {
          msg = `Độ ẩm đất khô (${cur.soil_moisture}%). Tự động kích hoạt bơm tưới an toàn (Safe Pumping) 15 giây.`;
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      } else {
        let msg = 'Tự động ngắt máy bơm nước.';
        if (cur.offline) {
          msg = 'Chế độ ngoại tuyến: Hoàn thành chu kỳ tưới duy trì sự sống.';
        } else if (cur.soil_moisture < 45 || prev.pump_on) {
          msg = 'Hoàn thành chu kỳ tưới. Máy bơm chuyển sang chế độ chờ (cooldown) 5 phút.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      }
    }

    // --- Phun sương ---
    if (prev.mist_on !== cur.mist_on && !isHumanAction('mist')) {
      if (cur.mist_on) {
        let msg = 'Tự động bật phun sương.';
        if (cur.env_code === 1) {
          msg = 'Sốc nhiệt: Tự động bật phun sương tuần hoàn để hạ nhiệt.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      } else {
        let msg = 'Tự động ngắt phun sương.';
        if (cur.env_code === 2) {
          msg = 'Úng khí: Tự động ngắt phun sương tránh gây nấm mốc lá.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      }
    }

    // --- Quạt ---
    if (prev.fan_on !== cur.fan_on && !isHumanAction('fan')) {
      if (cur.fan_on) {
        let msg = 'Tự động bật quạt thông gió.';
        if (cur.env_code === 1) {
          msg = 'Sốc nhiệt: Tự động bật quạt thông gió công suất tối đa.';
        } else if (cur.env_code === 2) {
          msg = 'Úng khí: Tự động bật quạt để tản ẩm.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      } else {
        newLogs.push({ time: timeStr, type: 'auto_action', message: 'Tự động tắt quạt thông gió.' });
      }
    }

    // --- Đèn LED quang hợp ---
    if (prev.led_on !== cur.led_on && !isHumanAction('led')) {
      if (cur.led_on) {
        let msg = 'Tự động bật đèn LED.';
        if (cur.offline) {
          msg = 'Chế độ ngoại tuyến: Tự động bật đèn quang hợp theo chu kỳ 14 giờ.';
        } else {
          msg = 'AI Scheduler: Hoàn thành quét camera. Khôi phục lại trạng thái đèn LED.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      } else {
        let msg = 'Tự động tắt đèn LED.';
        if (cur.offline) {
          msg = 'Chế độ ngoại tuyến: Tự động tắt đèn quang hợp theo chu kỳ 10 giờ.';
        } else {
          msg = 'AI Scheduler: Tạm tắt đèn LED để quét camera AI phát hiện sâu bệnh.';
        }
        newLogs.push({ time: timeStr, type: 'auto_action', message: msg });
      }
    }

    if (newLogs.length > 0) {
      setLogs((prevLogs) => {
        const nextLogs = [...prevLogs, ...newLogs];
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
  const offline = sensorData?.offline || false;

  // ─── Render ───────────────────────────────────
  return (
    <div className="app-layout">
      <AlertNotification />
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

        <nav className="app-header__nav">
          <button
            className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setActiveTab('dashboard')}
          >
            📊 Cảm biến & Điều khiển
          </button>
          <button
            className={`nav-tab ${activeTab === 'calendar' ? 'active' : ''}`}
            onClick={() => setActiveTab('calendar')}
          >
            📅 Lịch trình
          </button>
          <button
            className={`nav-tab ${activeTab === 'config' ? 'active' : ''}`}
            onClick={() => setActiveTab('config')}
          >
            ⚙️ Cấu hình
          </button>
          <button
            className={`nav-tab ${activeTab === 'logs' ? 'active' : ''}`}
            onClick={() => setActiveTab('logs')}
          >
            🖥️ Nhật ký
          </button>
        </nav>

        <div className="app-header__actions">
          <button className="btn btn--sm" onClick={() => setShowGallery(true)}>
            🖼️ Ảnh Bệnh
          </button>
        </div>
      </header>

      {/* Sidebar */}
      <div className="app-sidebar">
        <Sidebar
          systemInfo={systemInfo}
          onReconnect={() => reconnect()}
          isLoading={sysLoading}
          autoMode={autoMode}
          growthPreset={growthPreset}
          onToggleAutoMode={handleToggleAutoMode}
          onPresetChange={handlePresetChange}
        />
      </div>

      {/* Main Content */}
      <main className="app-main">
        {/* Cảnh báo an toàn (nếu có) */}
        <SafeModeBanner safeMode={safeMode} errorCode={errorCode} />

        {/* Cảnh báo mất kết nối ngoại tuyến */}
        {offline && (
          <div className="offline-banner animate-fade-in">
            <div className="offline-banner__icon">🔌</div>
            <div className="offline-banner__content">
              <h3 className="offline-banner__title">Hệ thống đang chạy ngoại tuyến (Offline Failsafe)</h3>
              <p className="offline-banner__desc">Arduino mất kết nối với PC quá 60 giây. Thiết bị đang tự duy trì sự sống cho cây (Đèn 14h, Bơm 6h/lần).</p>
            </div>
          </div>
        )}

        {activeTab === 'dashboard' && (
          <>
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
                togglePump={handleTogglePump}
                toggleMist={handleToggleMist}
                isLoading={pumpLoading}
                safeMode={safeMode}
              />
              <FanControl
                fanOn={fanOn}
                toggleFan={handleToggleFan}
                isLoading={fanLoading}
                safeMode={safeMode}
              />
              <LedControl
                ledOn={ledOn}
                toggleLed={handleToggleLed}
                isLoading={ledLoading}
                safeMode={safeMode}
              />
            </div>
          </>
        )}

        {activeTab === 'calendar' && (
          <CalendarPanel />
        )}

        {activeTab === 'config' && (
          <NewBatchPanel 
            currentPreset={growthPreset}
            onPresetChange={handlePresetChange}
            sensorData={sensorData}
          />
        )}

        {activeTab === 'logs' && (
          <div className="logs-tab-view animate-fade-in" style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
            <div className="logs-tab-view__actions card" style={{ padding: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-card)' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.1rem', color: 'var(--text-primary)' }}>📥 Tải xuống dữ liệu lịch sử</h3>
                <p style={{ margin: '5px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Tải toàn bộ dữ liệu cảm biến đã được thu tập dưới dạng tệp CSV.</p>
              </div>
              <button className="btn btn--primary" onClick={handleExport}>
                Export CSV File
              </button>
            </div>
            <SystemLogs logs={logs} />
          </div>
        )}
      </main>
      
      {/* Gallery Modal */}
      {showGallery && (
        <GalleryModal onClose={() => setShowGallery(false)} />
      )}

      {/* Confirmation Override Modal */}
      {confirmOverride.show && (
        <div className="modal-overlay">
          <div className="modal-content card confirm-modal animate-fade-in">
            <h3 className="confirm-modal__title">⚠️ Xác nhận can thiệp thủ công</h3>
            <p className="confirm-modal__text">
              Hệ thống đang chạy ở chế độ <strong>Tự động</strong>. Can thiệp thủ công để <strong>{confirmOverride.action} {confirmOverride.device === 'pump' ? 'máy bơm' : confirmOverride.device === 'mist' ? 'phun sương' : confirmOverride.device === 'fan' ? 'quạt' : 'đèn'}</strong> có thể phá vỡ chu kỳ sinh trưởng tự nhiên của cải thìa.
            </p>
            <p className="confirm-modal__text sub-text">
              *Tác vụ này sẽ tạm hoãn điều khiển tự động cho thiết bị này trong 15 phút.
            </p>
            <div className="confirm-modal__actions">
              <button 
                className="btn" 
                onClick={() => setConfirmOverride({ show: false, device: null, action: null, exec: null })}
              >
                Hủy bỏ
              </button>
              <button 
                className="btn btn--primary" 
                onClick={() => {
                  confirmOverride.exec();
                  setConfirmOverride({ show: false, device: null, action: null, exec: null });
                }}
              >
                Vẫn thực hiện
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
