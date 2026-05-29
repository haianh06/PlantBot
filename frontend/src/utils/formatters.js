/**
 * formatters.js — Utility functions format dữ liệu
 * ===================================================
 */

/**
 * Format nhiệt độ với 1 chữ số thập phân.
 * @param {number} value
 * @returns {string} "28.5"
 */
export function formatTemperature(value) {
  if (value === null || value === undefined || value === -1) return '--';
  return value.toFixed(1);
}

/**
 * Format phần trăm (không có decimal).
 * @param {number} value
 * @returns {string} "65"
 */
export function formatPercent(value) {
  if (value === null || value === undefined || value === -1) return '--';
  return Math.round(value).toString();
}

/**
 * Format timestamp ISO 8601 thành giờ ngắn.
 * @param {string} isoString - "2026-05-29T10:30:00+07:00"
 * @returns {string} "10:30:00"
 */
export function formatTime(isoString) {
  if (!isoString) return '--';
  try {
    const date = new Date(isoString);
    return date.toLocaleTimeString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
  } catch {
    return '--';
  }
}

/**
 * Format timestamp thành ngày giờ đầy đủ.
 * @param {string} isoString
 * @returns {string} "29/05/2026 10:30"
 */
export function formatDateTime(isoString) {
  if (!isoString) return '--';
  try {
    const date = new Date(isoString);
    return date.toLocaleString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return '--';
  }
}
