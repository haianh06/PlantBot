from typing import Literal
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

