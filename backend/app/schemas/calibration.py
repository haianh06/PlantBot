


from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field

class CalibrationData(BaseModel):
    """Thông số calibration cảm biến."""
    soil_moisture_dry: int = Field(default=520, description="Giá trị ADC khi đất khô")
    soil_moisture_wet: int = Field(default=260, description="Giá trị ADC khi đất ướt")