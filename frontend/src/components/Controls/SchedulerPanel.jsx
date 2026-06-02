/**
 * SchedulerPanel.jsx — Panel hẹn giờ bật/tắt thiết bị
 * ======================================================
 * Tính năng:
 *   - Xem danh sách lịch hẹn giờ hiện có
 *   - Thêm lịch mới (chọn thiết bị, hành động, giờ, ngày)
 *   - Xóa / bật-tắt từng lịch
 */

import { useState } from 'react';
import { ToggleSwitch } from '../common/ToggleSwitch';
import './SchedulerPanel.css';

const DEVICE_OPTIONS = [
  { value: 'pump', label: '💧 Máy bơm' },
  { value: 'mist', label: '🌫️ Phun sương' },
  { value: 'fan',  label: '🌀 Quạt' },
];

const DAY_LABELS = ['T2', 'T3', 'T4', 'T5', 'T6', 'T7', 'CN'];

export function SchedulerPanel({ schedules, onAdd, onRemove, onToggle, isLoading }) {
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    device: 'fan',
    action: 'on',
    time: '06:00',
    days: [0, 1, 2, 3, 4, 5, 6],
    label: '',
  });

  // Toggle ngày trong form
  const toggleDay = (dayIndex) => {
    setFormData((prev) => {
      const days = prev.days.includes(dayIndex)
        ? prev.days.filter((d) => d !== dayIndex)
        : [...prev.days, dayIndex].sort();
      return { ...prev, days };
    });
  };

  // Submit form
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!formData.time || formData.days.length === 0) return;
    await onAdd(formData);
    setShowForm(false);
    setFormData({ device: 'fan', action: 'on', time: '06:00', days: [0,1,2,3,4,5,6], label: '' });
  };

  // Device name helper
  const getDeviceLabel = (device) => {
    const opt = DEVICE_OPTIONS.find((o) => o.value === device);
    return opt ? opt.label : device;
  };

  return (
    <div className="scheduler-panel card animate-fade-in">
      <div className="card__header">
        <h2 className="card__title">
          <span>⏰</span> Hẹn Giờ
        </h2>
        <button
          className="btn btn--sm btn--primary"
          onClick={() => setShowForm(!showForm)}
        >
          {showForm ? '✕ Đóng' : '＋ Thêm'}
        </button>
      </div>

      <div className="card__body">
        {/* Form tạo schedule mới */}
        {showForm && (
          <form className="scheduler-form" onSubmit={handleSubmit}>
            <div className="scheduler-form__row">
              {/* Thiết bị */}
              <div className="scheduler-form__field">
                <label className="scheduler-form__label">Thiết bị</label>
                <select
                  className="scheduler-form__select"
                  value={formData.device}
                  onChange={(e) => setFormData({ ...formData, device: e.target.value })}
                >
                  {DEVICE_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              </div>

              {/* Hành động */}
              <div className="scheduler-form__field">
                <label className="scheduler-form__label">Hành động</label>
                <select
                  className="scheduler-form__select"
                  value={formData.action}
                  onChange={(e) => setFormData({ ...formData, action: e.target.value })}
                >
                  <option value="on">🟢 Bật</option>
                  <option value="off">🔴 Tắt</option>
                </select>
              </div>

              {/* Giờ */}
              <div className="scheduler-form__field">
                <label className="scheduler-form__label">Thời gian</label>
                <input
                  type="time"
                  className="scheduler-form__input"
                  value={formData.time}
                  onChange={(e) => setFormData({ ...formData, time: e.target.value })}
                  required
                />
              </div>
            </div>

            {/* Chọn ngày */}
            <div className="scheduler-form__field">
              <label className="scheduler-form__label">Ngày trong tuần</label>
              <div className="scheduler-form__days">
                {DAY_LABELS.map((label, index) => (
                  <button
                    type="button"
                    key={index}
                    className={`scheduler-form__day-btn ${formData.days.includes(index) ? 'scheduler-form__day-btn--active' : ''}`}
                    onClick={() => toggleDay(index)}
                  >
                    {label}
                  </button>
                ))}
              </div>
            </div>

            {/* Ghi chú */}
            <div className="scheduler-form__field">
              <label className="scheduler-form__label">Ghi chú (tùy chọn)</label>
              <input
                type="text"
                className="scheduler-form__input"
                placeholder="VD: Bật quạt sáng sớm"
                value={formData.label}
                onChange={(e) => setFormData({ ...formData, label: e.target.value })}
              />
            </div>

            <button
              type="submit"
              className="btn btn--primary"
              disabled={isLoading || formData.days.length === 0}
            >
              {isLoading ? <span className="spinner" /> : '💾 Tạo lịch'}
            </button>
          </form>
        )}

        {/* Danh sách schedules */}
        {schedules.length === 0 ? (
          <div className="scheduler-empty">
            <span className="scheduler-empty__icon">⏰</span>
            <p>Chưa có lịch hẹn giờ nào</p>
            <p className="scheduler-empty__hint">Nhấn "＋ Thêm" để tạo lịch mới</p>
          </div>
        ) : (
          <div className="scheduler-list">
            {schedules.map((item) => (
              <div
                key={item.id}
                className={`scheduler-item ${!item.enabled ? 'scheduler-item--disabled' : ''}`}
              >
                <div className="scheduler-item__left">
                  <span className="scheduler-item__time">{item.time}</span>
                  <div className="scheduler-item__info">
                    <span className="scheduler-item__device">
                      {getDeviceLabel(item.device)} — {item.action === 'on' ? 'Bật' : 'Tắt'}
                    </span>
                    {item.label && (
                      <span className="scheduler-item__label">{item.label}</span>
                    )}
                    <span className="scheduler-item__days">
                      {item.days.map((d) => DAY_LABELS[d]).join(', ')}
                    </span>
                  </div>
                </div>

                <div className="scheduler-item__right">
                  <ToggleSwitch
                    checked={item.enabled}
                    onChange={() => onToggle(item.id)}
                  />
                  <button
                    className="btn btn--sm btn--danger scheduler-item__delete"
                    onClick={() => onRemove(item.id)}
                    title="Xóa"
                  >
                    🗑
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
