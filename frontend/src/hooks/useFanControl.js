/**
 * useFanControl.js — Hook điều khiển quạt
 * ===========================================================
 * - Toggle quạt qua API
 * - Track trạng thái loading
 * - Đồng bộ trạng thái từ sensor data
 */

import { useState, useCallback } from 'react';
import { controlFan } from '../api/client';

export function useFanControl(sensorData) {
  const [isLoading, setIsLoading] = useState({ fan: false});

  // Trạng thái lấy từ sensor data (từ Arduino)
  const fanOn = sensorData?.fan_on ?? false;

  // Toggle quạt
  const toggleFan = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, fan: true }));
    try {
      const action = fanOn ? 'off' : 'on';
      await controlFan('fan', action);
    } catch (error) {
      console.error('Lỗi điều khiển quạt:', error);
    } finally {
      // Delay nhỏ để đợi Arduino phản hồi
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, fan: false }));
      }, 500);
    }
  }, [fanOn]);

  return {
    fanOn,
    toggleFan,
    isLoading,
  };
}
