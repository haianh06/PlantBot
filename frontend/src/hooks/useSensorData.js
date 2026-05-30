/**
 * useSensorData.js — Hook real-time sensor data qua WebSocket
 * =============================================================
 * - Tự động connect WebSocket khi mount
 * - Parse JSON → cập nhật state
 * - Lưu history (max records) cho biểu đồ
 * - Auto-reconnect khi mất kết nối
 * - Cleanup khi unmount
 */

import { useState, useEffect, useRef, useCallback } from 'react';
import { createSensorWebSocket, fetchSensorHistory } from '../api/client';

const MAX_HISTORY = 60; // Giữ tối đa 60 data points cho biểu đồ
const RECONNECT_DELAY = 3000; // 3 giây giữa các lần reconnect
const MAX_RETRIES = 10;

export function useSensorData() {
  const [sensorData, setSensorData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState(null);

  const wsRef = useRef(null);
  const retriesRef = useRef(0);
  const mountedRef = useRef(true);

  // Thêm data point mới vào history (giới hạn MAX_HISTORY)
  const addToHistory = useCallback((data) => {
    setHistory((prev) => {
      const next = [...prev, data];
      return next.length > MAX_HISTORY ? next.slice(-MAX_HISTORY) : next;
    });
  }, []);

  // Kết nối WebSocket
  const connect = useCallback(() => {
    if (!mountedRef.current) return;

    try {
      const ws = createSensorWebSocket();
      wsRef.current = ws;

      ws.onopen = () => {
        setIsConnected(true);
        setError(null);
        retriesRef.current = 0;
      };

      ws.onmessage = (event) => {
        try {
          const data = JSON.parse(event.data);
          setSensorData(data);
          addToHistory(data);
        } catch (e) {
          console.error('WebSocket parse error:', e);
        }
      };

      ws.onerror = () => {
        setError('Lỗi kết nối WebSocket');
      };

      ws.onclose = () => {
        setIsConnected(false);
        wsRef.current = null;

        // Auto-reconnect
        if (mountedRef.current && retriesRef.current < MAX_RETRIES) {
          retriesRef.current += 1;
          setTimeout(connect, RECONNECT_DELAY);
        }
      };
    } catch (e) {
      setError('Không thể kết nối WebSocket');
    }
  }, [addToHistory]);

  // Load history từ CSV khi mount
  useEffect(() => {
    mountedRef.current = true;

    // Fetch initial history
    fetchSensorHistory(MAX_HISTORY)
      .then((res) => {
        if (res.data && res.data.length > 0) {
          // Reverse lại vì API trả mới nhất trước
          const reversed = [...res.data].reverse();
          setHistory(reversed.map((row) => ({
            temperature: parseFloat(row.temperature),
            humidity: parseFloat(row.humidity),
            soil_moisture: parseInt(row.soil_moisture),
            pump_on: row.pump_on === 'True',
            mist_on: row.mist_on === 'True',
            fan_on: row.fan_on === 'True',
            timestamp: row.timestamp,
          })));
        }
      })
      .catch(() => { /* Ignore — CSV might not exist yet */ });

    // Connect WebSocket
    connect();

    return () => {
      mountedRef.current = false;
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [connect]);

  return { sensorData, history, isConnected, error };
}
