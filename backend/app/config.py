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
    SENSOR_READ_INTERVAL: float = Field(default=1.0, description="Interval đọc sensor (giây)")

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

def get_auto_mode() -> bool:
    """Lấy trạng thái Auto Mode từ settings.json."""
    settings = load_json_settings()
    return settings.get("auto_mode", True)


def update_auto_mode(enabled: bool) -> bool:
    """Cập nhật trạng thái Auto Mode vào settings.json."""
    settings = load_json_settings()
    settings["auto_mode"] = enabled
    save_json_settings(settings)
    return enabled


def get_growth_preset() -> str:
    """Lấy tên Preset gieo trồng hiện tại (mature / baby / custom)."""
    settings = load_json_settings()
    return settings.get("growth_preset", "mature")


def update_growth_preset(preset: str) -> str:
    """Cập nhật Preset gieo trồng và tự động thay đổi cấu hình ngày tương ứng nếu chọn mature/baby."""
    settings = load_json_settings()
    settings["growth_preset"] = preset
    
    if "data" not in settings:
        settings["data"] = {}
        
    # Tự động đồng bộ số ngày của preset
    if preset == "baby":
        settings["data"]["growth_config"] = {
            "stage1_days": 4,
            "stage2_days": 12,  # 4 + 8 days passed -> s2 = 12
            "stage3_days": 22,  # 12 + 10 days passed -> s3 = 22
        }
    elif preset == "mature":
        settings["data"]["growth_config"] = {
            "stage1_days": 5,
            "stage2_days": 17,  # 5 + 12 days passed -> s2 = 17
            "stage3_days": 32,  # 17 + 15 days passed -> s3 = 32
        }
        
    save_json_settings(settings)
    return preset


def get_growth_settings() -> dict:
    """Lấy thông tin cấu hình tăng trưởng từ settings.json."""
    settings = load_json_settings()
    res = settings.get("data", {
        "planting_date": "2026-06-10",
        "is_tracking": True,
        "current_crop": "Bok Choy",
        "growth_config": {
            "stage1_days": 5,
            "stage2_days": 17,
            "stage3_days": 32
        }
    })
    res["growth_preset"] = settings.get("growth_preset", "mature")
    return res


def update_growth_settings(data: dict) -> dict:
    """Cập nhật thông tin cấu hình tăng trưởng vào settings.json."""
    settings = load_json_settings()
    if "data" not in settings:
        settings["data"] = {}
    
    # Nếu đang update growth_config bằng tay từ UI, set preset thành custom
    if "growth_config" in data:
        settings["growth_preset"] = "custom"
        
    settings["data"].update(data)
    save_json_settings(settings)
    return settings["data"]


def get_timelapse_settings() -> dict:
    """Lấy cấu hình Timelapse từ settings.json."""
    settings = load_json_settings()
    return settings.get("camera", {}).get("timelapse", {
        "enabled": False,
        "interval_m": 5
    })


def update_timelapse_settings(enabled: bool, interval_m: int) -> dict:
    """Cập nhật cấu hình Timelapse vào settings.json."""
    settings = load_json_settings()
    if "camera" not in settings:
        settings["camera"] = {}
    
    timelapse_config = {
        "enabled": enabled,
        "interval_m": interval_m
    }
    settings["camera"]["timelapse"] = timelapse_config
    save_json_settings(settings)
    return timelapse_config

def get_notification_settings() -> dict:
    """Lấy cấu hình thông báo (Telegram + Web) từ settings.json."""
    settings = load_json_settings()
    return settings.get("notifications", {
        "telegram_enabled": False,
        "bot_token": "",
        "chat_id": "",
        "cooldown_minutes": 5
    })


def update_notification_settings(data: dict) -> dict:
    """Cập nhật cấu hình thông báo vào settings.json."""
    settings = load_json_settings()
    if "notifications" not in settings:
        settings["notifications"] = {}
    
    settings["notifications"].update(data)
    save_json_settings(settings)
    return settings["notifications"]
