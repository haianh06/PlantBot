"""
scheduler_service.py — Hẹn giờ bật/tắt thiết bị
====================================================
- Lưu danh sách schedules vào settings.json
- Background thread kiểm tra mỗi 30 giây
- Khi đúng giờ + đúng ngày → gửi lệnh qua SerialService
- CRUD: tạo, xóa, bật/tắt, liệt kê schedules

Mỗi schedule gồm:
  - device: "pump" | "mist" | "fan"
  - action: "on" | "off"
  - time:   "HH:MM" (24h)
  - days:   [0..6] (0=Monday, 6=Sunday)
  - enabled: true/false
"""

import json
import uuid
import threading
import time
import logging
from datetime import datetime
from pathlib import Path
from typing import Optional, Callable

from backend.app.models import ScheduleItem
from backend.app.config import PROJECT_ROOT

logger = logging.getLogger(__name__)

# Đường dẫn file lưu schedules (cùng settings.json)
SCHEDULES_FILE = PROJECT_ROOT / "schedules.json"


class SchedulerService:
    """
    Quản lý hẹn giờ bật/tắt thiết bị.

    Usage:
        scheduler = SchedulerService()
        scheduler.set_command_callback(serial_service.send_command)
        scheduler.start()

        scheduler.add_schedule("fan", "on", "06:30", [0,1,2,3,4,5,6])
        scheduler.add_schedule("fan", "off", "18:00")
    """

    CHECK_INTERVAL = 30  # Kiểm tra mỗi 30 giây

    def __init__(self):
        self._schedules: list[ScheduleItem] = []
        self._lock = threading.Lock()
        self._running = False
        self._thread: Optional[threading.Thread] = None
        self._command_callback: Optional[Callable[[str], bool]] = None
        self._last_executed: dict[str, str] = {}  # schedule_id → "HH:MM" đã chạy

        # Load từ file
        self._load_from_file()

    # ─── Callback ────────────────────────────────────────────

    def set_command_callback(self, callback: Callable[[str], bool]) -> None:
        """
        Đăng ký callback gửi lệnh Serial.
        Thường là serial_service.send_command.
        """
        self._command_callback = callback

    # ─── Lifecycle ───────────────────────────────────────────

    def start(self) -> None:
        """Bắt đầu background thread kiểm tra schedule."""
        if self._running:
            return

        self._running = True
        self._thread = threading.Thread(
            target=self._check_loop,
            name="scheduler",
            daemon=True,
        )
        self._thread.start()
        logger.info(f"Scheduler bắt đầu ({len(self._schedules)} lịch đã load)")

    def stop(self) -> None:
        """Dừng scheduler thread."""
        self._running = False
        if self._thread and self._thread.is_alive():
            self._thread.join(timeout=5)
        logger.info("Scheduler đã dừng")

    # ─── CRUD ────────────────────────────────────────────────

    def get_all(self) -> list[ScheduleItem]:
        """Lấy tất cả schedules."""
        with self._lock:
            return list(self._schedules)

    def add_schedule(
        self,
        device: str,
        action: str,
        time_str: str,
        days: list[int] = None,
        enabled: bool = True,
        label: str = "",
    ) -> ScheduleItem:
        """
        Thêm schedule mới.

        Args:
            device: "pump" | "mist" | "fan"
            action: "on" | "off"
            time_str: "HH:MM" (24h format)
            days: [0..6] (default: mỗi ngày)
            enabled: active hay không
            label: ghi chú tùy chọn
        """
        if days is None:
            days = [0, 1, 2, 3, 4, 5, 6]

        # Validate time format
        try:
            datetime.strptime(time_str, "%H:%M")
        except ValueError:
            raise ValueError(f"Sai format thời gian: {time_str}. Phải là HH:MM")

        item = ScheduleItem(
            id=str(uuid.uuid4())[:8],
            device=device,
            action=action,
            time=time_str,
            days=days,
            enabled=enabled,
            label=label,
        )

        with self._lock:
            self._schedules.append(item)
            self._save_to_file()

        logger.info(f"Đã thêm schedule: {device} {action} lúc {time_str}")
        return item

    def remove_schedule(self, schedule_id: str) -> bool:
        """Xóa schedule theo ID."""
        with self._lock:
            before = len(self._schedules)
            self._schedules = [s for s in self._schedules if s.id != schedule_id]
            removed = len(self._schedules) < before

            if removed:
                self._save_to_file()
                # Xóa khỏi cache đã chạy
                self._last_executed.pop(schedule_id, None)
                logger.info(f"Đã xóa schedule: {schedule_id}")

            return removed

    def toggle_schedule(self, schedule_id: str) -> Optional[ScheduleItem]:
        """Bật/tắt schedule theo ID."""
        with self._lock:
            for s in self._schedules:
                if s.id == schedule_id:
                    s.enabled = not s.enabled
                    self._save_to_file()
                    logger.info(f"Schedule {schedule_id}: {'enabled' if s.enabled else 'disabled'}")
                    return s
            return None

    # ─── Persistence ─────────────────────────────────────────

    def _save_to_file(self) -> None:
        """Lưu schedules vào file JSON."""
        try:
            data = [s.model_dump() for s in self._schedules]
            with open(SCHEDULES_FILE, "w", encoding="utf-8") as f:
                json.dump(data, f, indent=2, ensure_ascii=False)
        except IOError as e:
            logger.error(f"Lỗi lưu schedules: {e}")

    def _load_from_file(self) -> None:
        """Load schedules từ file JSON (nếu tồn tại)."""
        if not SCHEDULES_FILE.exists():
            return

        try:
            with open(SCHEDULES_FILE, "r", encoding="utf-8") as f:
                data = json.load(f)

            self._schedules = [ScheduleItem(**item) for item in data]
            logger.info(f"Đã load {len(self._schedules)} schedule từ file")
        except (json.JSONDecodeError, IOError, Exception) as e:
            logger.error(f"Lỗi load schedules: {e}")

    # ─── Background Check Loop ───────────────────────────────

    def _check_loop(self) -> None:
        """Background thread: kiểm tra schedule mỗi CHECK_INTERVAL giây."""
        while self._running:
            try:
                self._check_and_execute()
            except Exception as e:
                logger.error(f"Lỗi scheduler check: {e}")

            time.sleep(self.CHECK_INTERVAL)

    def _check_and_execute(self) -> None:
        """Kiểm tra tất cả schedules, thực thi nếu đúng giờ."""
        now = datetime.now()
        current_time = now.strftime("%H:%M")
        current_day = now.weekday()  # 0=Monday ... 6=Sunday

        with self._lock:
            for schedule in self._schedules:
                if not schedule.enabled:
                    continue

                # Kiểm tra ngày
                if current_day not in schedule.days:
                    continue

                # Kiểm tra giờ
                if schedule.time != current_time:
                    continue

                # Tránh chạy lại trong cùng 1 phút
                last_run = self._last_executed.get(schedule.id)
                if last_run == current_time:
                    continue

                # Thực thi!
                self._execute_schedule(schedule)
                self._last_executed[schedule.id] = current_time

    def _execute_schedule(self, schedule: ScheduleItem) -> None:
        """Thực thi 1 schedule — gửi lệnh qua callback."""
        if not self._command_callback:
            logger.warning("Scheduler: không có command callback")
            return

        # Map device + action → Serial command
        cmd_map = {
            ("pump", "on"): "PUMP_ON",
            ("pump", "off"): "PUMP_OFF",
            ("mist", "on"): "MIST_ON",
            ("mist", "off"): "MIST_OFF",
            ("fan", "on"): "FAN_ON",
            ("fan", "off"): "FAN_OFF",
        }

        serial_cmd = cmd_map.get((schedule.device, schedule.action))
        if not serial_cmd:
            logger.error(f"Schedule lệnh không hợp lệ: {schedule.device} {schedule.action}")
            return

        success = self._command_callback(serial_cmd)

        device_names = {"pump": "Máy bơm", "mist": "Phun sương", "fan": "Quạt"}
        device_name = device_names.get(schedule.device, schedule.device)
        action_name = "BẬT" if schedule.action == "on" else "TẮT"

        if success:
            logger.info(f"⏰ Scheduler: {action_name} {device_name} (lịch: {schedule.label or schedule.id})")
        else:
            logger.error(f"⏰ Scheduler: Lỗi {action_name} {device_name}")
