"""
serial_service.py — Giao tiếp Serial với Arduino
==================================================
Quản lý kết nối USB Serial:
  - Background thread đọc liên tục dữ liệu JSON từ Arduino
  - Thread-safe: dùng Lock để đồng bộ dữ liệu
  - Gửi lệnh điều khiển (PUMP_ON, MIST_OFF, ...) xuống Arduino
  - Auto-detect COM port khi cấu hình port="auto"
  - Callback mechanism để notify WebSocket subscribers
"""

import json
import threading
import time
import logging
from typing import Optional, Callable

import serial
import serial.tools.list_ports

from backend.app.schemas.sensor_data import SensorData
from backend.app.utils.time_helper import get_timestamp

logger = logging.getLogger(__name__)


class SerialService:
    """
    Singleton service quản lý kết nối Serial USB với Arduino.

    Usage:
        service = SerialService()
        service.connect("COM3", 9600)
        service.send_command("PUMP_ON")
        data = service.get_latest_data()
        service.disconnect()
    """

    def __init__(self):
        self._serial: Optional[serial.Serial] = None
        self._port: Optional[str] = None
        self._baudrate: int = 9600
        self._latest_data: Optional[SensorData] = None
        self._lock = threading.Lock()
        self._running = False
        self._reader_thread: Optional[threading.Thread] = None
        self._on_data_callback: Optional[Callable[[SensorData], None]] = None

    # ─── Connection Management ──────────────────────────────

    def connect(self, port: str = "auto", baudrate: int = 9600) -> bool:
        """
        Mở kết nối Serial.

        Args:
            port: COM port (vd: "COM3") hoặc "auto" để tự detect
            baudrate: Tốc độ truyền (mặc định 9600)

        Returns:
            True nếu kết nối thành công
        """
        # Ngắt kết nối cũ nếu có
        if self._serial and self._serial.is_open:
            self.disconnect()

        # Auto-detect COM port
        if port == "auto":
            port = self._auto_detect_port()
            if not port:
                logger.warning("Không tìm thấy Arduino trên bất kỳ COM port nào")
                return False

        try:
            self._serial = serial.Serial(
                port=port,
                baudrate=baudrate,
                timeout=1,
            )
            self._port = port
            self._baudrate = baudrate

            # Chờ Arduino reset sau khi mở Serial
            time.sleep(2)

            # Bắt đầu background reader thread
            self._running = True
            self._reader_thread = threading.Thread(
                target=self._read_loop,
                name="serial-reader",
                daemon=True,
            )
            self._reader_thread.start()

            logger.info(f"Đã kết nối Serial: {port} @ {baudrate} baud")
            return True

        except serial.SerialException as e:
            logger.error(f"Lỗi kết nối Serial {port}: {e}")
            self._serial = None
            return False

    def disconnect(self) -> None:
        """Ngắt kết nối Serial an toàn."""
        self._running = False

        if self._reader_thread and self._reader_thread.is_alive():
            self._reader_thread.join(timeout=3)

        if self._serial and self._serial.is_open:
            try:
                self._serial.close()
            except Exception as e:
                logger.error(f"Lỗi đóng Serial: {e}")

        self._serial = None
        self._port = None
        logger.info("Đã ngắt kết nối Serial")

    @property
    def is_connected(self) -> bool:
        """Kiểm tra trạng thái kết nối."""
        return self._serial is not None and self._serial.is_open

    @property
    def port(self) -> Optional[str]:
        """COM port đang kết nối."""
        return self._port

    @property
    def baudrate(self) -> int:
        """Baudrate hiện tại."""
        return self._baudrate

    # ─── Data Access ────────────────────────────────────────

    def get_latest_data(self) -> Optional[SensorData]:
        """Trả về dữ liệu cảm biến mới nhất (thread-safe)."""
        with self._lock:
            return self._latest_data

    def set_on_data_callback(self, callback: Callable[[SensorData], None]) -> None:
        """
        Đăng ký callback khi có dữ liệu mới.
        Dùng để notify WebSocket broadcast.
        """
        self._on_data_callback = callback

    # ─── Command Sending ────────────────────────────────────

    def send_command(self, command: str) -> bool:
        """
        Gửi lệnh điều khiển xuống Arduino.

        Args:
            command: Lệnh text (vd: "PUMP_ON", "MIST_OFF")

        Returns:
            True nếu gửi thành công
        """
        if not self.is_connected:
            logger.warning("Không thể gửi lệnh: chưa kết nối Serial")
            return False

        try:
            self._serial.write(f"{command}\n".encode("utf-8"))
            logger.info(f"Đã gửi lệnh: {command}")
            return True
        except serial.SerialException as e:
            logger.error(f"Lỗi gửi lệnh Serial: {e}")
            return False

    # ─── Port Utilities ─────────────────────────────────────

    @staticmethod
    def get_available_ports() -> list[str]:
        """Liệt kê tất cả COM port khả dụng trên máy."""
        ports = serial.tools.list_ports.comports()
        return [p.device for p in ports]

    def _auto_detect_port(self) -> Optional[str]:
        """
        Tự động tìm COM port của Arduino.
        Ưu tiên port có mô tả chứa 'Arduino' hoặc 'CH340' hoặc 'USB'.
        """
        ports = serial.tools.list_ports.comports()
        arduino_keywords = ["arduino", "ch340", "ch341", "usb serial", "usb-serial"]

        for port in ports:
            description = (port.description or "").lower()
            if any(kw in description for kw in arduino_keywords):
                logger.info(f"Auto-detect: tìm thấy Arduino tại {port.device} ({port.description})")
                return port.device

        # Fallback: trả về port đầu tiên nếu có
        if ports:
            logger.info(f"Auto-detect fallback: dùng port đầu tiên {ports[0].device}")
            return ports[0].device

        return None

    # ─── Background Reader ──────────────────────────────────

    def _read_loop(self) -> None:
        """
        Background thread: đọc liên tục dữ liệu JSON từ Serial.
        Parse JSON → cập nhật _latest_data → gọi callback.
        """
        logger.info("Serial reader thread bắt đầu")

        while self._running:
            if not self.is_connected:
                time.sleep(1)
                continue

            try:
                # Đọc 1 dòng từ Serial
                line = self._serial.readline().decode("utf-8").strip()
                if not line:
                    continue

                # Parse JSON
                data = json.loads(line)

                # Chuyển đổi sang SensorData
                sensor_data = SensorData(
                    temperature=data.get("temp", -1),
                    humidity=data.get("humi", -1),
                    soil_moisture=data.get("soil", -1),
                    pump_on=bool(data.get("pump", 0)),
                    mist_on=bool(data.get("mist", 0)),
                    fan_on=bool(data.get("fan", 0)),
                    led_on=bool(data.get("led", 0)),
                    timestamp=get_timestamp(),
                )

                # Cập nhật thread-safe
                with self._lock:
                    self._latest_data = sensor_data

                # Notify callback (WebSocket broadcast)
                if self._on_data_callback:
                    try:
                        self._on_data_callback(sensor_data)
                    except Exception as e:
                        logger.error(f"Lỗi callback: {e}")

            except json.JSONDecodeError:
                # Bỏ qua dòng không phải JSON (vd: "ready" message)
                pass
            except serial.SerialException as e:
                logger.error(f"Serial read error: {e}")
                time.sleep(1)
            except Exception as e:
                logger.error(f"Unexpected error in reader thread: {e}")
                time.sleep(0.5)

        logger.info("Serial reader thread kết thúc")
