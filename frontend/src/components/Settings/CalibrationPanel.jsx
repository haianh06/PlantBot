/**
 * CalibrationPanel.jsx — Panel cài đặt Calibration
 * ====================================================
 * Cho phép user cập nhật DRY/WET value cho soil moisture sensor.
 * Lưu vào settings.json qua API.
 */

import { useState, useEffect } from 'react';
import { fetchCalibration, updateCalibration } from '../../api/client';
import './CalibrationPanel.css';

export function CalibrationPanel({ sensorData }) {
  const [dryValue, setDryValue] = useState(520);
  const [wetValue, setWetValue] = useState(260);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState('');

  // Load calibration hiện tại
  useEffect(() => {
    fetchCalibration()
      .then((data) => {
        setDryValue(data.soil_moisture_dry);
        setWetValue(data.soil_moisture_wet);
      })
      .catch(() => { /* Dùng giá trị mặc định */ });
  }, []);

  // Lưu calibration
  const handleSave = async () => {
    setIsSaving(true);
    setMessage('');
    try {
      await updateCalibration(dryValue, wetValue);
      setMessage('✅ Đã lưu cấu hình và đồng bộ xuống Arduino');
      setTimeout(() => setMessage(''), 4000);
    } catch {
      setMessage('❌ Lỗi lưu hiệu chuẩn');
    } finally {
      setIsSaving(false);
    }
  };

  const currentRawVal = sensorData?.soil_raw;

  return (
    <div className="calibration-panel">
      {/* Live Raw Display */}
      <div className="calibration-panel__live-raw card" style={{ padding: '12px', marginBottom: '16px', background: 'rgba(255,255,255,0.02)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', border: '1px solid var(--border)' }}>
        <span style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)' }}>📡 Giá trị thô hiện tại từ cảm biến:</span>
        <strong style={{ fontSize: '1.1rem', color: currentRawVal !== undefined ? 'var(--accent-orange)' : 'var(--text-tertiary)' }}>
          {currentRawVal !== undefined ? `${currentRawVal} (ADC)` : 'Đang đợi dữ liệu...'}
        </strong>
      </div>

      <div className="calibration-panel__field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '16px' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="calibration-panel__label">Giá trị KHÔ (ADC)</label>
          <input
            type="number"
            className="calibration-panel__input"
            value={dryValue}
            onChange={(e) => setDryValue(parseInt(e.target.value) || 0)}
            min={0}
            max={1023}
            style={{ width: '100%' }}
          />
        </div>
        <button
          className="btn btn--sm"
          style={{ marginTop: '24px', flexShrink: 0 }}
          onClick={() => currentRawVal !== undefined && setDryValue(currentRawVal)}
          disabled={currentRawVal === undefined}
          title="Lấy giá trị thô hiện tại làm mốc Đất Khô (trong không khí)"
        >
          🎯 Đo Khô (Air)
        </button>
      </div>

      <div className="calibration-panel__field" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: '10px', marginBottom: '20px' }}>
        <div style={{ flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
          <label className="calibration-panel__label">Giá trị ƯỚT (ADC)</label>
          <input
            type="number"
            className="calibration-panel__input"
            value={wetValue}
            onChange={(e) => setWetValue(parseInt(e.target.value) || 0)}
            min={0}
            max={1023}
            style={{ width: '100%' }}
          />
        </div>
        <button
          className="btn btn--sm"
          style={{ marginTop: '24px', flexShrink: 0 }}
          onClick={() => currentRawVal !== undefined && setWetValue(currentRawVal)}
          disabled={currentRawVal === undefined}
          title="Lấy giá trị thô hiện tại làm mốc Đất Ướt (trong cốc nước)"
        >
          🎯 Đo Ướt (Water)
        </button>
      </div>

      <div className="calibration-panel__actions">
        <button
          className="btn btn--primary btn--sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <span className="spinner" /> : 'Lưu hiệu chuẩn'}
        </button>
        {message && <span className="calibration-panel__message">{message}</span>}
      </div>
    </div>
  );
}
