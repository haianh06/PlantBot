"""
csv_service.py — Lưu trữ dữ liệu cảm biến vào CSV
=====================================================
- Append dữ liệu sensor vào file CSV
- Đọc lịch sử N bản ghi cuối
- Auto-create file + header nếu chưa tồn tại
- Thread-safe cho concurrent writes

CSV Format:
  timestamp,temperature,humidity,soil_moisture,pump_on,mist_on
"""

import csv
import threading
import logging
from pathlib import Path
from typing import Optional

from backend.app.schemas.sensor_data import SensorData
from backend.app.config import PROJECT_ROOT

logger = logging.getLogger(__name__)

# Header columns cho file CSV
CSV_HEADERS = ["timestamp", "temperature", "humidity", "soil_moisture", "pump_on", "mist_on", "fan_on", "led_on", "stage"]

class CSVService:
    """
    Quản lý lưu trữ dữ liệu cảm biến vào file CSV.

    Usage:
        service = CSVService("data/sensor_data.csv")
        service.save_record(sensor_data)
        history = service.get_history(limit=50)
    """

    def __init__(self, file_path: str = "data/sensor_data.csv"):
        self._file_path = PROJECT_ROOT / file_path
        self._lock = threading.Lock()
        self._ensure_file_exists()

    def _ensure_file_exists(self) -> None:
        """Tạo file CSV với header nếu chưa tồn tại."""
        # Tạo thư mục cha nếu cần
        self._file_path.parent.mkdir(parents=True, exist_ok=True)

        if not self._file_path.exists():
            with open(self._file_path, "w", newline="", encoding="utf-8") as f:
                writer = csv.writer(f)
                writer.writerow(CSV_HEADERS)
            logger.info(f"Đã tạo file CSV: {self._file_path}")

    def save_record(self, data: SensorData) -> None:
        """
        Append 1 bản ghi sensor vào file CSV (thread-safe).

        Args:
            data: Dữ liệu cảm biến từ Arduino
        """
        with self._lock:
            try:
                with open(self._file_path, "a", newline="", encoding="utf-8") as f:
                    writer = csv.writer(f)
                    writer.writerow([
                        data.timestamp,
                        data.temperature,
                        data.humidity,
                        data.soil_moisture,
                        data.pump_on,
                        data.mist_on,
                        data.fan_on,
                        data.led_on,
                    ])
            except IOError as e:
                logger.error(f"Lỗi ghi CSV: {e}")

    def get_history(self, limit: int = 100) -> list[dict]:
        """
        Đọc N bản ghi cuối cùng từ file CSV.

        Args:
            limit: Số bản ghi tối đa cần lấy

        Returns:
            List[dict] — mỗi dict tương ứng 1 dòng CSV
        """
        with self._lock:
            try:
                with open(self._file_path, "r", encoding="utf-8") as f:
                    reader = csv.DictReader(f)
                    rows = list(reader)

                # Trả về N dòng cuối, mới nhất trước
                return rows[-limit:][::-1]
            except (IOError, csv.Error) as e:
                logger.error(f"Lỗi đọc CSV: {e}")
                return []

    def get_file_path(self) -> Path:
        """Trả về đường dẫn file CSV để download/export."""
        return self._file_path

    @property
    def record_count(self) -> int:
        """Đếm số bản ghi trong file CSV (không tính header)."""
        try:
            with open(self._file_path, "r", encoding="utf-8") as f:
                return sum(1 for _ in f) - 1  # Trừ header
        except IOError:
            return 0
Error:
            return 0
