"""
config.py — Cấu hình tập trung cho PlantBot Backend
====================================================
- Đọc cấu hình từ file settings.json (calibration, serial, camera)
- Cung cấp singleton Settings để dùng chung trong toàn app
- Hỗ trợ lưu/cập nhật settings runtime (calibration từ UI)
"""

import json
from pathlib import Path
from functools import lru_cache

from pydantic_settings import BaseSettings
from pydantic import Field


# ─── Đường dẫn ──────────────────────────────────────────────
# Thư mục gốc project (chứa settings.json, data/, ...)
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent
SETTINGS_FILE = PROJECT_ROOT / "settings.json"
DATA_DIR = PROJECT_ROOT / "data"


# ─── Settings class ─────────────────────────────────────────
class Settings(BaseSettings):
    """Cấu hình ứng dụng — load từ .env hoặc environment variables."""

    # Serial
    SERIAL_PORT: str = Field(default="auto", description="COM port hoặc 'auto' để tự detect")
    SERIAL_BAUDRATE: int = Field(default=9600, description="Serial baudrate")

    # Data
    CSV_FILE_PATH: str = Field(default="data/sensor_data.csv", description="Đường dẫn file CSV")
    SENSOR_READ_INTERVAL: float = Field(default=2.0, description="Interval đọc sensor (giây)")

    # Camera
    CAMERA_INDEX: int = Field(default=0, description="Camera index mặc định")

    # Server
    BACKEND_HOST: str = Field(default="0.0.0.0", description="Host")
    BACKEND_PORT: int = Field(default=8000, description="Port")

    class Config:
        env_prefix = "PLANTBOT_"
        env_file = ".env"
        extra = "ignore"


@lru_cache()
def get_settings() -> Settings:
    """Singleton — trả về instance Settings duy nhất."""
    return Settings()


# ─── JSON Settings (calibration + runtime config) ───────────
def load_json_settings() -> dict:
    """
    Đọc file settings.json.
    Trả về dict rỗng nếu file không tồn tại.
    """
    if SETTINGS_FILE.exists():
        with open(SETTINGS_FILE, "r", encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_json_settings(data: dict) -> None:
    """
    Ghi dict vào file settings.json.
    Tạo file mới nếu chưa tồn tại.
    """
    with open(SETTINGS_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=4, ensure_ascii=False)


def get_calibration() -> dict:
    """Lấy thông số calibration từ settings.json."""
    settings = load_json_settings()
    return settings.get("sensor_calibration", {
        "soil_moisture_dry": 520,
        "soil_moisture_wet": 260,
    })


def update_calibration(dry_value: int, wet_value: int) -> dict:
    """
    Cập nhật thông số calibration và lưu vào settings.json.
    Trả về calibration mới.
    """
    settings = load_json_settings()
    settings["sensor_calibration"] = {
        "soil_moisture_dry": dry_value,
        "soil_moisture_wet": wet_value,
    }
    save_json_settings(settings)
    return settings["sensor_calibration"]
