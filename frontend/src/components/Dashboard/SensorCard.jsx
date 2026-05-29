/**
 * SensorCard.jsx — Card hiển thị 1 metric cảm biến
 * ====================================================
 * Glassmorphism card với glow effect theo màu accent.
 * Hiển thị: icon, label, giá trị lớn, progress bar.
 */

import { formatTemperature, formatPercent } from '../../utils/formatters';
import './SensorCard.css';

export function SensorCard({ icon, label, value, unit, color, min = 0, max = 100, formatter }) {
  // Format giá trị hiển thị
  const displayValue = formatter ? formatter(value) : value?.toString() ?? '--';

  // Tính phần trăm cho progress bar
  const percentage = value !== null && value !== undefined && value !== -1
    ? Math.min(100, Math.max(0, ((value - min) / (max - min)) * 100))
    : 0;

  return (
    <div
      className="sensor-card card animate-fade-in"
      style={{ '--card-accent': `var(--accent-${color})`, '--card-accent-dim': `var(--accent-${color}-dim)` }}
    >
      <div className="sensor-card__header">
        <span className="sensor-card__icon">{icon}</span>
        <span className="sensor-card__label">{label}</span>
      </div>

      <div className="sensor-card__value-container">
        <span className="sensor-card__value">{displayValue}</span>
        <span className="sensor-card__unit">{unit}</span>
      </div>

      <div className="sensor-card__progress">
        <div
          className="sensor-card__progress-bar"
          style={{ width: `${percentage}%` }}
        />
      </div>
    </div>
  );
}
