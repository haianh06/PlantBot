from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import Float, DateTime
from datetime import datetime
from app.db.base_model import Base

class SensorData(Base):
    __tablename__ = "sensor_data"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    temperature: Mapped[float] = mapped_column(Float, nullable=True)
    humidity: Mapped[float] = mapped_column(Float, nullable=True)
    soil_moisture: Mapped[float] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(DateTime, default=datetime.utcnow)
