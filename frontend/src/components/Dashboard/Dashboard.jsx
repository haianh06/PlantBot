/**
 * Dashboard.jsx — Dashboard chính
 * ==================================
 * Tổng hợp: Camera → Sensor Cards → Sensor Chart → Pump Controls
 * (Camera đặt trên cùng theo feedback user)
 */

import { SensorCard } from './SensorCard';
import { SensorChart } from './SensorChart';
import { formatTemperature, formatPercent } from '../../utils/formatters';
import './Dashboard.css';

export function Dashboard({ sensorData, history }) {
  return (
    <div className="dashboard">
      {/* Sensor Cards — 3 cột */}
      <div className="dashboard__cards">
        <SensorCard
          icon="🌡"
          label="Nhiệt độ"
          value={sensorData?.temperature}
          unit="°C"
          color="orange"
          min={0}
          max={50}
          formatter={formatTemperature}
        />
        <SensorCard
          icon="💧"
          label="Độ ẩm KK"
          value={sensorData?.humidity}
          unit="%"
          color="cyan"
          min={0}
          max={100}
          formatter={formatPercent}
        />
        <SensorCard
          icon="🌱"
          label="Độ ẩm đất"
          value={sensorData?.soil_moisture}
          unit="%"
          color="green"
          min={0}
          max={100}
          formatter={formatPercent}
        />
      </div>

      {/* Biểu đồ lịch sử */}
      <SensorChart history={history} />
    </div>
  );
}
