from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String, DateTime, Boolean
from datetime import datetime
from app.db.base_model import Base

class DeviceControlHistory(Base):
    __tablename__ = "device_control_history"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    device_name: Mapped[str] = mapped_column(String(50), nullable=False)
    action: Mapped[str] = mapped_column(String(20), nullable=False)  # e.g., "ON", "OFF"
    status: Mapped[bool] = mapped_column(Boolean, default=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
