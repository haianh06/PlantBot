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

/** Gửi lệnh điều khiển bơm/phun sương */
export const controlPump = (device, action) =>
  request('/pump/control', {
    method: 'POST',
    body: JSON.stringify({ device, action }),
  });

/** Lấy trạng thái bơm/sương hiện tại */
export const fetchPumpStatus = () => request('/pump/status');

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

/** Lấy trạng thái camera */
export const fetchCameraStatus = () => request('/camera/status');

/** Lấy danh sách camera khả dụng */
export const fetchCameraList = () => request('/camera/list');

/** URL stream MJPEG cho camera */
export const getCameraStreamUrl = (index = 0) =>
  `${API_BASE}/camera/stream/${index}`;

// ─── WebSocket ──────────────────────────────────────────────

/**
 * Tạo WebSocket connection cho real-time sensor data.
 * @returns {WebSocket}
 */
export function createSensorWebSocket() {
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  const wsUrl = `${protocol}//${window.location.host}/api/sensors/ws`;
  return new WebSocket(wsUrl);
}
