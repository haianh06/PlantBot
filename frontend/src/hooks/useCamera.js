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
} from '../api/client';

export function useCamera() {
  const [cameras, setCameras] = useState({});
  const [aiStates, setAiStates] = useState({});
  const [isLoading, setIsLoading] = useState({});

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
    toggleCamera: toggleCam,
    toggleAi,
    getStreamUrl,
    isActive,
    isAiActive,
    isLoading,
  };
}
