"""
models.py — Pydantic Schemas cho PlantBot
==========================================
Định nghĩa tất cả request/response models cho API endpoints.
"""

from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field


# ─── Sensor Data ─────────────────────────────────────────────
class SensorData(BaseModel):
    """Dữ liệu cảm biến từ Arduino."""
    temperature: float = Field(description="Nhiệt độ không khí (°C)")
    humidity: float = Field(description="Độ ẩm không khí (%)")
    soil_moisture: int = Field(description="Độ ẩm đất (%)")
    pump_on: bool = Field(default=False, description="Máy bơm đang bật")
    mist_on: bool = Field(default=False, description="Phun sương đang bật")
    fan_on: bool = Field(default=False, description="Quạt đang bật")
    led_on: bool = Field(default=False, description="Đèn đang bật")
    timestamp: str = Field(default="", description="Thời điểm đọc dữ liệu (ISO 8601)")


# ─── Pump Control ────────────────────────────────────────────
class PumpCommand(BaseModel):
    """Lệnh điều khiển bơm/phun sương từ frontend."""
    device: Literal["pump", "mist", "fan"] = Field(description="Thiết bị: pump, mist hoặc fan")
    action: Literal["on", "off"] = Field(description="Hành động: on hoặc off")

y

class PumpStatus(BaseModel):
    """Trạng thái hiện tại của relay."""
    pump_on: bool = Field(description="Máy bơm đang bật")
    mist_on: bool = Field(description="Phun sương đang bật")
    fan_on: bool = Field(description="Quạt đang bật")


# ─── System Info ─────────────────────────────────────────────
class SystemInfo(BaseModel):
    """Thông tin kết nối hệ thống."""
    serial_port: Optional[str] = Field(default=None, description="COM port đang kết nối")
    is_connected: bool = Field(default=False, description="Trạng thái kết nối Serial")
    baudrate: int = Field(default=9600, description="Serial baudrate")
    available_ports: list[str] = Field(default_factory=list, description="Danh sách COM port khả dụng")


class ConnectRequest(BaseModel):
    """Yêu cầu kết nối Serial."""
    port: str = Field(default="auto", description="COM port hoặc 'auto'")


# ─── Camera ──────────────────────────────────────────────────
class CameraInfo(BaseModel):
    """Thông tin trạng thái camera."""
    index: int = Field(description="Camera index")
    is_active: bool = Field(description="Camera đang stream")


class CameraListResponse(BaseModel):
    """Danh sách camera."""
    cameras: list[CameraInfo] = Field(default_factory=list)
    available_indices: list[int] = Field(default_factory=list, description="Camera indices khả dụng")


# ─── Calibration ─────────────────────────────────────────────
class CalibrationData(BaseModel):
    """Thông số calibration cảm biến."""
    soil_moisture_dry: int = Field(default=520, description="Giá trị ADC khi đất khô")
    soil_moisture_wet: int = Field(default=260, description="Giá trị ADC khi đất ướt")


# ─── Generic Response ────────────────────────────────────────
class MessageResponse(BaseModel):
    """Response message đơn giản."""
    message: str
    success: bool = True

