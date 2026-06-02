/**
 * useCamera.js — Hook quản lý camera (multi-camera support)
 * ===========================================================
 * - Toggle từng camera theo index
 * - Track trạng thái mỗi camera
 * - Cung cấp URL stream MJPEG
 */

import { useState, useCallback, useEffect } from 'react';
import {
  toggleCamera as apiToggleCamera,
  fetchCameraStatus,
  getCameraStreamUrl,
} from '../api/client';

export function useCamera() {
  // Map: { 0: true, 1: false } — camera index → đang active
  const [cameras, setCameras] = useState({});
  const [isLoading, setIsLoading] = useState({});

  // Fetch trạng thái camera ban đầu
  useEffect(() => {
    fetchCameraStatus()
      .then((res) => {
        const state = {};
        (res.cameras || []).forEach((cam) => {
          state[cam.index] = cam.is_active;
        });
        setCameras(state);
      })
      .catch(() => { /* Camera service chưa sẵn sàng */ });
  }, []);

  // Toggle camera theo index
  const toggleCam = useCallback(async (index) => {
    setIsLoading((prev) => ({ ...prev, [index]: true }));
    try {
      await apiToggleCamera(index);
      setCameras((prev) => ({
        ...prev,
        [index]: !prev[index],
      }));
    } catch (error) {
      console.error(`Lỗi toggle camera ${index}:`, error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [index]: false }));
    }
  }, []);

  // Lấy URL stream cho camera
  const getStreamUrl = useCallback((index) => {
    return getCameraStreamUrl(index);
  }, []);

  // Kiểm tra camera có đang active
  const isActive = useCallback((index) => {
    return cameras[index] || false;
  }, [cameras]);

  return {
    cameras,
    toggleCamera: toggleCam,
    getStreamUrl,
    isActive,
    isLoading,
  };
}
