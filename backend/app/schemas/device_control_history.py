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
    




