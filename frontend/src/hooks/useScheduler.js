/**
 * useScheduler.js — Hook quản lý lịch hẹn giờ
 * ===============================================
 * - Fetch danh sách schedules
 * - Tạo / xóa / toggle schedule
 * - Refresh khi thay đổi
 */

import { useState, useEffect, useCallback } from 'react';
import {
  fetchSchedules,
  createSchedule,
  deleteSchedule,
  toggleSchedule,
} from '../api/client';

export function useScheduler() {
  const [schedules, setSchedules] = useState([]);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch danh sách schedules
  const refresh = useCallback(async () => {
    try {
      const res = await fetchSchedules();
      setSchedules(res.schedules || []);
    } catch (error) {
      console.error('Lỗi fetch schedules:', error);
    }
  }, []);

  // Load ban đầu
  useEffect(() => {
    refresh();
  }, [refresh]);

  // Tạo schedule mới
  const addSchedule = useCallback(async (data) => {
    setIsLoading(true);
    try {
      await createSchedule(data);
      await refresh();
    } catch (error) {
      console.error('Lỗi tạo schedule:', error);
    } finally {
      setIsLoading(false);
    }
  }, [refresh]);

  // Xóa schedule
  const removeSchedule = useCallback(async (id) => {
    try {
      await deleteSchedule(id);
      await refresh();
    } catch (error) {
      console.error('Lỗi xóa schedule:', error);
    }
  }, [refresh]);

  // Toggle bật/tắt
  const toggleSched = useCallback(async (id) => {
    try {
      await toggleSchedule(id);
      await refresh();
    } catch (error) {
      console.error('Lỗi toggle schedule:', error);
    }
  }, [refresh]);

  return {
    schedules,
    addSchedule,
    removeSchedule,
    toggleSchedule: toggleSched,
    isLoading,
    refresh,
  };
}
