from pydantic import BaseModel, Field 
from datetime import datetime
from typing import Optional

class SensorDataBase(BaseModel):
    temperature: float = Field(description="Nhiệt độ không khí (°C)")
    humidity: float = Field(description="Độ ẩm không khí (%)")
    soil_moisture: int = Field(description="Độ ẩm đất (%)")
    pump_on: bool = Field(default=False, description="Máy bơm đang bật")
    mist_on: bool = Field(default=False, description="Phun sương đang bật")
    growth_stage: int = Field(default=1, description="Giai đoạn tăng trưởng (1-4)")
    timestamp: str = Field(default="", description="Thời điểm đọc dữ liệu (ISO 8601)")

class SensorDataCreate(SensorDataBase):
    pass

class SensorData(SensorDataBase):
    id: Optional[int] = None
    timestamp: datetime

    class Config:
        from_attributes = True
