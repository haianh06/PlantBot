/**
 * usePumpControl.js — Hook điều khiển máy bơm & phun sương
 * ===========================================================
 * - Toggle bơm/sương qua API
 * - Track trạng thái loading
 * - Đồng bộ trạng thái từ sensor data
 */

import { useState, useCallback } from 'react';
import { controlPump } from '../api/client';

export function usePumpControl(sensorData) {
  const [isLoading, setIsLoading] = useState({ pump: false, mist: false });

  // Trạng thái lấy từ sensor data (từ Arduino)
  const pumpOn = sensorData?.pump_on ?? false;
  const mistOn = sensorData?.mist_on ?? false;

  // Toggle máy bơm
  const togglePump = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, pump: true }));
    try {
      const action = pumpOn ? 'off' : 'on';
      await controlPump('pump', action);
    } catch (error) {
      console.error('Lỗi điều khiển máy bơm:', error);
    } finally {
      // Delay nhỏ để đợi Arduino phản hồi
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, pump: false }));
      }, 500);
    }
  }, [pumpOn]);

  // Toggle phun sương
  const toggleMist = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, mist: true }));
    try {
      const action = mistOn ? 'off' : 'on';
      await controlPump('mist', action);
    } catch (error) {
      console.error('Lỗi điều khiển phun sương:', error);
    } finally {
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, mist: false }));
      }, 500);
    }
  }, [mistOn]);

  return {
    pumpOn,
    mistOn,
    togglePump,
    toggleMist,
    isLoading,
  };
}
