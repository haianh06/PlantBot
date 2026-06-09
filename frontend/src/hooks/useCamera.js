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
  toggleCameraAi as apiToggleCameraAi,
  fetchCameraStatus,
  getCameraStreamUrl,
  fetchAiConfig as apiFetchAiConfig,
  updateAiConfig as apiUpdateAiConfig,
} from '../api/client';

export function useCamera() {
  const [cameras, setCameras] = useState({});
  const [aiStates, setAiStates] = useState({});
  const [isLoading, setIsLoading] = useState({});
  const [aiConfig, setAiConfig] = useState({ interval_n: 60, duration_m: 10 });

  // Fetch trạng thái camera ban đầu
  useEffect(() => {
    fetchCameraStatus()
      .then((res) => {
        const state = {};
        const aiState = {};
        (res.cameras || []).forEach((cam) => {
          state[cam.index] = cam.is_active;
          aiState[cam.index] = cam.ai_active;
        });
        setCameras(state);
        setAiStates(aiState);
      })
      .catch(() => { /* Camera service chưa sẵn sàng */ });

    apiFetchAiConfig()
      .then((res) => {
        setAiConfig(res);
      })
      .catch(console.error);
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

  // Toggle AI theo index
  const toggleAi = useCallback(async (index) => {
    setIsLoading((prev) => ({ ...prev, [`ai_${index}`]: true }));
    try {
      await apiToggleCameraAi(index);
      setAiStates((prev) => ({
        ...prev,
        [index]: !prev[index],
      }));
    } catch (error) {
      console.error(`Lỗi toggle AI ${index}:`, error);
    } finally {
      setIsLoading((prev) => ({ ...prev, [`ai_${index}`]: false }));
    }
  }, []);

  // Cập nhật cấu hình AI
  const updateAiConfig = useCallback(async (n, m) => {
    try {
      await apiUpdateAiConfig(n, m);
      setAiConfig({ interval_n: n, duration_m: m });
    } catch (error) {
      console.error('Lỗi cập nhật cấu hình AI:', error);
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

  // Kiểm tra AI có đang active
  const isAiActive = useCallback((index) => {
    return aiStates[index] || false;
  }, [aiStates]);

  return {
    cameras,
    aiStates,
    aiConfig,
    toggleCamera: toggleCam,
    toggleAi,
    updateAiConfig,
    getStreamUrl,
    isActive,
    isAiActive,
    isLoading,
  };
}
