/**
 * SensorChart.jsx — Biểu đồ lịch sử sensor data
 * ==================================================
 * Dùng Recharts — Area/Line chart cho 3 metrics:
 *   🌡 Temperature (cam), 💧 Humidity (cyan), 🌱 Soil (xanh lá)
 */

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { formatTime } from '../../utils/formatters';
import './SensorChart.css';

/** Custom tooltip hiển thị chi tiết khi hover */
function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;

  return (
    <div className="chart-tooltip">
      <p className="chart-tooltip__time">{formatTime(label)}</p>
      {payload.map((entry) => (
        <p key={entry.name} className="chart-tooltip__item" style={{ color: entry.color }}>
          {entry.name}: <strong>{entry.value}</strong>
          {entry.name === 'Nhiệt độ' ? '°C' : '%'}
        </p>
      ))}
    </div>
  );
}

export function SensorChart({ history = [] }) {
  // Format data cho Recharts
  const chartData = history.map((item) => ({
    time: item.timestamp,
    temperature: item.temperature,
    humidity: item.humidity,
    soil_moisture: item.soil_moisture,
  }));

  if (chartData.length === 0) {
    return (
      <div className="sensor-chart card animate-fade-in">
        <div className="card__header">
          <h2 className="card__title"><span>📊</span> Biểu Đồ Cảm Biến</h2>
        </div>
        <div className="card__body sensor-chart__empty">
          <p>Chưa có dữ liệu để hiển thị</p>
          <p className="sensor-chart__empty-hint">Dữ liệu sẽ xuất hiện khi Arduino bắt đầu gửi</p>
        </div>
      </div>
    );
  }

  return (
    <div className="sensor-chart card animate-fade-in">
      <div className="card__header">
        <h2 className="card__title"><span>📊</span> Biểu Đồ Cảm Biến</h2>
        <span className="sensor-chart__count">{chartData.length} điểm dữ liệu</span>
      </div>
      <div className="card__body">
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -10, bottom: 5 }}>
            <defs>
              {/* Gradient fills */}
              <linearGradient id="gradTemp" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#f59e0b" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradHumi" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#06b6d4" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#06b6d4" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="gradSoil" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
              </linearGradient>
            </defs>

            <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />

            <XAxis
              dataKey="time"
              tickFormatter={formatTime}
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
            />
            <YAxis
              stroke="var(--text-tertiary)"
              fontSize={11}
              tickLine={false}
              domain={[0, 100]}
            />

            <Tooltip content={<CustomTooltip />} />

            <Legend
              wrapperStyle={{ fontSize: '12px', color: 'var(--text-secondary)' }}
            />

            <Area
              type="monotone"
              dataKey="temperature"
              name="Nhiệt độ"
              stroke="#f59e0b"
              fill="url(#gradTemp)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="humidity"
              name="Độ ẩm KK"
              stroke="#06b6d4"
              fill="url(#gradHumi)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
            <Area
              type="monotone"
              dataKey="soil_moisture"
              name="Độ ẩm đất"
              stroke="#22c55e"
              fill="url(#gradSoil)"
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4 }}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
