/**
 * useSystemInfo.js — Hook thông tin hệ thống (Serial connection)
 * ================================================================
 * - Fetch thông tin kết nối Serial
 * - Poll định kỳ để cập nhật trạng thái
 * - Reconnect functionality
 */

import { useState, useEffect, useCallback } from 'react';
import { fetchSystemInfo, connectSerial } from '../api/client';

const POLL_INTERVAL = 5000; // Poll mỗi 5 giây

export function useSystemInfo() {
  const [systemInfo, setSystemInfo] = useState({
    serial_port: null,
    is_connected: false,
    baudrate: 9600,
    available_ports: [],
  });
  const [isLoading, setIsLoading] = useState(false);

  // Fetch system info
  const refresh = useCallback(async () => {
    try {
      const info = await fetchSystemInfo();
      setSystemInfo(info);
    } catch (error) {
      // Backend chưa sẵn sàng
      console.error('Lỗi fetch system info:', error);
    }
  }, []);

  // Reconnect Arduino
  const reconnect = useCallback(async (port = 'auto') => {
    setIsLoading(true);
    try {
      await connectSerial(port);
      await refresh();
    } catch (error) {
      console.error('Lỗi reconnect:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Poll system info định kỳ
  useEffect(() => {
    refresh();
    const interval = setInterval(refresh, POLL_INTERVAL);
    return () => clearInterval(interval);
  }, [refresh]);

  return { systemInfo, refresh, reconnect, isLoading };
}
