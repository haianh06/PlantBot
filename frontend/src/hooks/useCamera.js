/**
 * useCamera.js — Hook quản lý camera (multi-camera support)
 * ===========================================================
 * - Toggle từng camera theo index
 * - Track trạng thái mỗi camera
 * - Cung cấp URL stream MJPEG
 * - Polling AI disease detection status cho Camera 2 (USB)
 */

import { useState, useCallback, useEffect, useRef } from 'react';
import {
  toggleCamera as apiToggleCamera,
  fetchCameraStatus,
  getCameraStreamUrl,
  fetchDiseaseStatus,
} from '../api/client';

// Interval polling disease status (ms) — đồng bộ với backend predict interval
const DISEASE_POLL_INTERVAL = 3000;

export function useCamera() {
  // Map: { 0: true, 1: false } — camera index → đang active
  const [cameras, setCameras] = useState({});
  const [isLoading, setIsLoading] = useState({});

  // AI Disease Detection status cho Camera 2
  const [diseaseStatus, setDiseaseStatus] = useState(null);
  const pollRef = useRef(null);

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

  // Polling disease status khi Camera 2 (index=1) đang active
  useEffect(() => {
    if (cameras[1]) {
      // Camera 2 đang bật → bắt đầu polling
      const poll = () => {
        fetchDiseaseStatus()
          .then((status) => setDiseaseStatus(status))
          .catch(() => { /* Ignore polling errors */ });
      };

      // Fetch ngay lập tức
      poll();

      // Thiết lập interval
      pollRef.current = setInterval(poll, DISEASE_POLL_INTERVAL);

      return () => {
        if (pollRef.current) {
          clearInterval(pollRef.current);
          pollRef.current = null;
        }
      };
    } else {
      // Camera 2 tắt → clear polling + reset status
      if (pollRef.current) {
        clearInterval(pollRef.current);
        pollRef.current = null;
      }
      setDiseaseStatus(null);
    }
  }, [cameras[1]]);

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
    diseaseStatus,
  };
}
