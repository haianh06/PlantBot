from pydantic import BaseModel, Field
from datetime import datetime
from typing import Literal
class DeviceControlHistoryBase(BaseModel):
    device_name: str
    action: str
    status: bool = True

class DeviceControlHistoryCreate(DeviceControlHistoryBase):
    pass

class DeviceControlHistory(DeviceControlHistoryBase):
    id: int
    timestamp: datetime

    class Config:
        from_attributes = True

# ─── Pump Control ────────────────────────────────────────────
class PumpCommand(BaseModel):
    """Lệnh điều khiển bơm/phun sương từ frontend."""
    device: Literal["pump", "mist"] = Field(description="Thiết bị: pump hoặc mist")
    action: Literal["on", "off"] = Field(description="Hành động: on hoặc off")


class PumpStatus(BaseModel):
    """Trạng thái hiện tại của relay."""
    pump_on: bool = Field(description="Máy bơm đang bật")
    mist_on: bool = Field(description="Phun sương đang bật")

# ─── LED Control────────────────────────────────────────────
class LedCommand(BaseModel):
    """Lệnh điều khiển đèn từ frontend."""
    device: Literal["led"] = Field(description="Thiết bị: đèn")
    action: Literal["on", "off"] = Field(description="Hành động: on hoặc off")
class LedStatus(BaseModel):
    """Trạng thái hiện tại của relay."""
    led_on: bool = Field(description="Đèn đang bật")

# ─── Fan Control────────────────────────────────────────────
class FanStatus(BaseModel):
    """Trạng thái hiện tại của relay."""
    fan_on: bool = Field(description="Quạt đang bật")
class FanCommand(BaseModel):
    """Lệnh điều khiển quạt từ frontend."""
    device: Literal["fan"] = Field(description="Thiết bị: quạt")
    action: Literal["on", "off"] = Field(description="Hành động: on hoặc off")



