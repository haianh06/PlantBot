from typing import Literal, Optional
from pydantic import Field, BaseModel
# ─── Pump Control ────────────────────────────────────────────
class PumpCommand(BaseModel):
    """Lệnh điều khiển bơm/phun sương từ frontend."""
    device: Literal["pump", "mist"] = Field(description="Thiết bị: pump hoặc mist")
    action: Literal["on", "off"] = Field(description="Hành động: on hoặc off")


class PumpStatus(BaseModel):
    """Trạng thái hiện tại của relay."""
    pump_on: bool = Field(description="Máy bơm đang bật")
    mist_on: bool = Field(description="Phun sương đang bật")


class SystemInfo(BaseModel):
    """Thông tin tổng quan về hệ thống."""
    serial_port: Optional[str] = Field(None, description="Cổng Serial đang kết nối")
    is_connected: bool = Field(False, description="Trạng thái kết nối với Arduino")
    baudrate: int = Field(9600, description="Tốc độ baud")
    available_ports: list[str] = Field(default_factory=list, description="Danh sách các cổng COM khả dụng")


class ConnectRequest(BaseModel):
    """Yêu cầu kết nối Serial."""
    port: str = Field(..., description="Cổng COM (vd: 'COM3') hoặc 'auto'")

