/**
 * usePumpControl.js — Hook điều khiển máy bơm, phun sương & quạt
 * ================================================================
 * - Toggle bơm/sương/quạt qua API
 * - Track trạng thái loading
 * - Đồng bộ trạng thái từ sensor data
 */

import { useState, useCallback } from 'react';
import { controlPump } from '../api/client';

export function usePumpControl(sensorData) {
  const [isLoading, setIsLoading] = useState({ pump: false, mist: false, fan: false });

  // Trạng thái lấy từ sensor data (từ Arduino)
  const pumpOn = sensorData?.pump_on ?? false;
  const mistOn = sensorData?.mist_on ?? false;
  const fanOn = sensorData?.fan_on ?? false;

  // Generic toggle function
  const toggleDevice = useCallback(async (device, currentState) => {
    setIsLoading((prev) => ({ ...prev, [device]: true }));
    try {
      const action = currentState ? 'off' : 'on';
      await controlPump(device, action);
    } catch (error) {
      console.error(`Lỗi điều khiển ${device}:`, error);
    } finally {
      // Delay nhỏ để đợi Arduino phản hồi
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, [device]: false }));
      }, 500);
    }
  }, []);

  // Toggle máy bơm
  const togglePump = useCallback(() => toggleDevice('pump', pumpOn), [toggleDevice, pumpOn]);

  // Toggle phun sương
  const toggleMist = useCallback(() => toggleDevice('mist', mistOn), [toggleDevice, mistOn]);

  // Toggle quạt
  const toggleFan = useCallback(() => toggleDevice('fan', fanOn), [toggleDevice, fanOn]);

  return {
    pumpOn,
    mistOn,
    fanOn,
    togglePump,
    toggleMist,
    toggleFan,
    isLoading,
  };
}
