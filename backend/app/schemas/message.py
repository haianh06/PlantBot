
from datetime import datetime
from typing import Optional, Literal

from pydantic import BaseModel, Field

class MessageResponse(BaseModel):
    """Response message đơn giản."""
    message: str
    success: bool = True