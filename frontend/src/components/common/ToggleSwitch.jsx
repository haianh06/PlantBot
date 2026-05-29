/**
 * ToggleSwitch.jsx — Switch bật/tắt reusable
 * ==============================================
 * CSS-only toggle switch (không dùng thư viện).
 */

import './ToggleSwitch.css';

export function ToggleSwitch({ checked = false, onChange, disabled = false, label }) {
  return (
    <label className={`toggle-switch ${disabled ? 'toggle-switch--disabled' : ''}`}>
      <input
        type="checkbox"
        className="toggle-switch__input"
        checked={checked}
        onChange={(e) => onChange?.(e.target.checked)}
        disabled={disabled}
      />
      <span className="toggle-switch__slider" />
      {label && <span className="toggle-switch__label">{label}</span>}
    </label>
  );
}
