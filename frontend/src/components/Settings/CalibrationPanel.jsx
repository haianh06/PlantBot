/**
 * CalibrationPanel.jsx — Panel cài đặt Calibration
 * ====================================================
 * Cho phép user cập nhật DRY/WET value cho soil moisture sensor.
 * Lưu vào settings.json qua API.
 */

import { useState, useEffect } from 'react';
import { fetchCalibration, updateCalibration } from '../../api/client';
import './CalibrationPanel.css';

export function CalibrationPanel() {
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
      setMessage('✅ Đã lưu');
      setTimeout(() => setMessage(''), 3000);
    } catch {
      setMessage('❌ Lỗi lưu');
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="calibration-panel">
      <div className="calibration-panel__field">
        <label className="calibration-panel__label">
          Giá trị KHÔ (ADC)
        </label>
        <input
          type="number"
          className="calibration-panel__input"
          value={dryValue}
          onChange={(e) => setDryValue(parseInt(e.target.value) || 0)}
          min={0}
          max={1023}
        />
      </div>

      <div className="calibration-panel__field">
        <label className="calibration-panel__label">
          Giá trị ƯỚT (ADC)
        </label>
        <input
          type="number"
          className="calibration-panel__input"
          value={wetValue}
          onChange={(e) => setWetValue(parseInt(e.target.value) || 0)}
          min={0}
          max={1023}
        />
      </div>

      <div className="calibration-panel__actions">
        <button
          className="btn btn--primary btn--sm"
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? <span className="spinner" /> : 'Lưu'}
        </button>
        {message && <span className="calibration-panel__message">{message}</span>}
      </div>
    </div>
  );
}
