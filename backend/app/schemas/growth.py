from pydantic import BaseModel, Field
from typing import Optional

class GrowthConfig(BaseModel):
    stage1_days: int = Field(default=5, description="Số ngày giai đoạn 1")
    stage2_days: int = Field(default=12, description="Số ngày giai đoạn 2")
    stage3_days: int = Field(default=25, description="Số ngày giai đoạn 3")

class GrowthSettings(BaseModel):
    planting_date: str = Field(description="Ngày trồng (YYYY-MM-DD)")
    is_tracking: bool = Field(default=True, description="Có đang theo dõi hay không")
    current_crop: str = Field(default="Bok Choy", description="Tên loại cây")
    growth_config: GrowthConfig
