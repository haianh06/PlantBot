from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field

class CameraInfo(BaseModel):
    """Thông tin trạng thái camera."""
    index: int = Field(description="Camera index")
    is_active: bool = Field(description="Camera đang stream")


class CameraListResponse(BaseModel):
    """Danh sách camera."""
    cameras: list[CameraInfo] = Field(default_factory=list)
    available_indices: list[int] = Field(default_factory=list, description="Camera indices khả dụng")
