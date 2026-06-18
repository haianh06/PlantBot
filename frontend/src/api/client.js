/**
 * client.js — API Client cho PlantBot Backend
 * ==============================================
 * Centralized fetch wrapper + WebSocket helper.
 * Tất cả API calls đi qua đây.
 */

const API_BASE = '/api';

// ─── Generic Fetch Helper ──────────────────────────────────

/**
 * Fetch wrapper với error handling.
 * @param {string} endpoint - Đường dẫn API (vd: "/sensors/current")
 * @param {object} options - fetch options
 * @returns {Promise<any>} Response JSON
 */
async function request(endpoint, options = {}) {
  const url = `${API_BASE}${endpoint}`;

  const config = {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  };

  const response = await fetch(url, config);

  if (!response.ok) {
    throw new Error(`API Error: ${response.status} ${response.statusText}`);
  }

  return response.json();
}

// ─── Sensor APIs ────────────────────────────────────────────

/** Lấy dữ liệu cảm biến mới nhất */
export const fetchSensorData = () => request('/sensors/current');

/** Lấy lịch sử sensor data từ CSV */
export const fetchSensorHistory = (limit = 50) =>
  request(`/sensors/history?limit=${limit}`);

/** URL download file CSV */
export const getExportUrl = () => `${API_BASE}/sensors/export`;

// ─── Pump Control APIs ─────────────────────────────────────

/** Gửi lệnh điều khiển bơm/phun sương/quạt */
export const controlPump = (device, action) =>
  request('/pump/control', {
    method: 'POST',
    body: JSON.stringify({ device, action }),
  });

/** Lấy trạng thái bơm/sương/quạt hiện tại */
export const fetchPumpStatus = () => request('/pump/status');

// ─── Fan Control APIs ─────────────────────────────────────

/** Gửi lệnh điều khiển quạt */
export const controlFan = (device, action) =>
  request('/fan/control', {
    method: 'POST',
    body: JSON.stringify({ device, action }),
  });

/** Lấy trạng thái quạt hiện tại */
export const fetchFanStatus = () => request('/fan/status');

// ─── Led Control APIs ──────────────────────────────────────

/** Gửi lệnh điều khiển đèn */
export const controlLed = (device, action) =>
  request('/led/control', {
    method: 'POST',
    body: JSON.stringify({ device, action }),
  });

/** Lấy trạng thái đèn hiện tại */
export const fetchLedStatus = () => request('/led/status');


// ─── System APIs ────────────────────────────────────────────

/** Lấy thông tin hệ thống (Serial + connection) */
export const fetchSystemInfo = () => request('/system/info');

/** Lấy danh sách COM port */
export const fetchPorts = () => request('/system/ports');

/** Kết nối/reconnect Arduino */
export const connectSerial = (port = 'auto') =>
  request('/system/connect', {
    method: 'POST',
    body: JSON.stringify({ port }),
  });

/** Ngắt kết nối Arduino */
export const disconnectSerial = () =>
  request('/system/disconnect', { method: 'POST' });

// ─── Calibration APIs ──────────────────────────────────────

/** Lấy thông số calibration hiện tại */
export const fetchCalibration = () => request('/system/calibration');

/** Cập nhật thông số calibration */
export const updateCalibration = (dryValue, wetValue) =>
  request('/system/calibration', {
    method: 'POST',
    body: JSON.stringify({
      soil_moisture_dry: dryValue,
      soil_moisture_wet: wetValue,
    }),
  });

// ─── Camera APIs ────────────────────────────────────────────

/** Toggle camera bật/tắt */
export const toggleCamera = (index = 0) =>
  request(`/camera/toggle/${index}`, { method: 'POST' });

/** Toggle AI cho camera */
export const toggleCameraAi = (index = 0) =>
  request(`/camera/toggle_ai/${index}`, { method: 'POST' });

/** Lấy trạng thái camera */
export const fetchCameraStatus = () => request('/camera/status');

/** Lấy danh sách camera khả dụng */
export const fetchCameraList = () => request('/camera/list');

/** URL stream MJPEG cho camera */
export const getCameraStreamUrl = (index = 0) =>
  `${API_BASE}/camera/stream/${index}`;



// ─── AI & Gallery APIs ────────────────────────────────────────

/** Lấy cấu hình Timelapse */
export const fetchTimelapseConfig = () => request('/camera/timelapse_config');

/** Cập nhật cấu hình Timelapse */
export const updateTimelapseConfig = (enabled, interval_m) =>
  request('/camera/timelapse_config', {
    method: 'POST',
    body: JSON.stringify({ enabled, interval_m }),
  });


/** Lấy cấu hình lập lịch AI */
export const fetchAiConfig = () => request('/camera/ai_config');

/** Cập nhật cấu hình lập lịch AI */
export const updateAiConfig = (interval_n, duration_m) =>
  request('/camera/ai_config', {
    method: 'POST',
    body: JSON.stringify({ interval_n, duration_m }),
  });

/** Lấy danh sách ảnh phát hiện bệnh */
export const fetchGalleryImages = () => request('/gallery/');

/** Tạo URL xem ảnh cụ thể */
export const getGalleryImageUrl = (filename) => `${API_BASE}/gallery/${filename}`;

// ─── WebSocket ──────────────────────────────────────────────

/**
 * Tạo WebSocket connection cho real-time sensor data.
 * @returns {WebSocket}
 */
export function createSensorWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  // Tự động xác định địa chỉ máy chủ (hỗ trợ localhost, LAN IP, Tailscale) qua proxy của Frontend
  const wsUrl = `${protocol}//${window.location.host}/api/sensors/ws`;
  return new WebSocket(wsUrl);
}


// ─── Automation, Presets & Calendar APIs ────────────────────

/** Lấy cấu hình tự động hóa */
export const fetchAutoMode = () => request('/system/auto-mode');

/** Cập nhật bật/tắt chế độ tự động hóa */
export const updateAutoMode = (enabled) =>
  request('/system/auto-mode', {
    method: 'POST',
    body: JSON.stringify({ enabled }),
  });

/** Thay đổi Preset gieo trồng (mature / baby / custom) */
export const updatePreset = (preset) =>
  request('/system/preset', {
    method: 'POST',
    body: JSON.stringify({ preset }),
  });

/** Lấy danh sách lịch trình gieo trồng (Calendar) */
export const fetchCalendar = () => request('/system/calendar');

/** Bắt đầu lứa rau mới */
export const startNewBatch = (preset, plantingDate, growthConfig = null) =>
  request('/system/new-batch', {
    method: 'POST',
    body: JSON.stringify({
      preset,
      planting_date: plantingDate,
      growth_config: growthConfig,
    }),
  });

/** Lấy cấu hình tăng trưởng (bao gồm trạng thái is_tracking) */
export const fetchGrowthConfig = () => request('/system/growth');

/** Cập nhật cấu hình tăng trưởng */
export const updateGrowthConfig = (config) =>
  request('/system/growth', {
    method: 'POST',
    body: JSON.stringify(config),
  });

