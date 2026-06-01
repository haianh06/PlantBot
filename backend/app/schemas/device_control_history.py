from pydantic import BaseModel
from datetime import datetime

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
