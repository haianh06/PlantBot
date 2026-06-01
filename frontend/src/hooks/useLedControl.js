/**
 * useLedControl.js — Hook điều khiển đèn
 * ===========================================================
 * - Toggle đèn qua API
 * - Track trạng thái loading
 * - Đồng bộ trạng thái từ sensor data
 */

import { useState, useCallback } from 'react';
import { controlLed } from '../api/client';

export function useLedControl(sensorData) {
  const [isLoading, setIsLoading] = useState({ led: false});

  // Trạng thái lấy từ sensor data (từ Arduino)
  const ledOn = sensorData?.led_on ?? false;

  // Toggle đèn
  const toggleLed = useCallback(async () => {
    setIsLoading((prev) => ({ ...prev, led: true }));
    try {
      const action = ledOn ? 'off' : 'on';
      await controlLed('led', action);
    } catch (error) {
      console.error('Lỗi điều khiển đèn:', error);
    } finally {
      // Delay nhỏ để đợi Arduino phản hồi
      setTimeout(() => {
        setIsLoading((prev) => ({ ...prev, led: false }));
      }, 500);
    }
  }, [ledOn]);

  return {
    ledOn,
    toggleLed,
    isLoading,
  };
}
