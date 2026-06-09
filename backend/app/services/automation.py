"""
automation.py — Automation Service
==================================================
Quản lý logic tự động hóa dựa trên:
  1. Giai đoạn tăng trưởng (Stage-based)
  2. Lịch trình thời gian (Time-based)
  3. Phản ứng cảm biến (Sensor-driven)
"""

import json
import logging
import asyncio
from datetime import datetime, date
from typing import Optional, Dict, Any

from backend.app.config import PROJECT_ROOT
from backend.app.schemas.sensor_data import SensorData

logger = logging.getLogger(__name__)

class AutomationService:
    def __init__(self, serial_service, start_date: Optional[date] = None):
        self.serial = serial_service
        self.start_date = start_date or date.today()
        self.profiles = self._load_profiles()
        self.current_stage_info = {}
        self._running = False
        self._task: Optional[asyncio.Task] = None

    def _load_profiles(self) -> list:
        profile_path = PROJECT_ROOT / "backend/app/config/growth_profiles.json"
        try:
            with open(profile_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            logger.error(f"Lỗi load growth profiles: {e}")
            return []

    def get_current_day(self) -> int:
        """Tính số ngày kể từ khi bắt đầu trồng."""
        delta = date.today() - self.start_date
        return delta.days + 1

    def get_stage_config(self) -> Dict[str, Any]:
        """Lấy cấu hình của giai đoạn hiện tại."""
        day = self.get_current_day()
        for stage in self.profiles:
            start, end = stage["days"]
            if start <= day <= end:
                self.current_stage_info = stage
                return stage["config"]
        return {}

    async def start(self):
        if self._running: return
        self._running = True
        self._task = asyncio.create_task(self._automation_loop())
        logger.info(f"🌿 Automation Service started. Day {self.get_current_day()}")

    async def stop(self):
        self._running = False
        if self._task:
            self._task.cancel()
            try:
                await self._task
            except asyncio.CancelledError:
                pass
        logger.info("🌿 Automation Service stopped.")

    async def _automation_loop(self):
        """Loop kiểm tra và điều khiển định kỳ (mỗi phút)."""
        while self._running:
            try:
                config = self.get_stage_config()
                if not config:
                    await asyncio.sleep(60)
                    continue

                now = datetime.now()
                current_time = now.strftime("%H:%M")

                # 1. Điều khiển Đèn LED theo lịch giai đoạn
                if "led_schedule" in config:
                    sched = config["led_schedule"]
                    if current_time == sched["on"]:
                        self.serial.send_command("LED_ON")
                    elif current_time == sched["off"]:
                        self.serial.send_command("LED_OFF")
                elif config.get("led_mode") == "ALWAYS_OFF":
                    self.serial.send_command("LED_OFF")

                # 2. Điều khiển Quạt
                fan_mode = config.get("fan_mode")
                latest = self.serial.get_latest_data()
                if latest:
                    if fan_mode == "ALWAYS_ON_WITH_LED" and latest.led_on:
                        self.serial.send_command("FAN_ON")
                    elif fan_mode == "OFF":
                        self.serial.send_command("FAN_OFF")

                # 3. Điều khiển Bơm (Tạm thời theo interval, ML sẽ tune duration_base)
                # Note: Logic bơm phức tạp hơn nên cần check timestamp lần cuối tưới
                # [TODO: Implement persistent last_watered check]

                await asyncio.sleep(60) # Kiểm tra mỗi phút
            except Exception as e:
                logger.error(f"Error in automation loop: {e}")
                await asyncio.sleep(10)
