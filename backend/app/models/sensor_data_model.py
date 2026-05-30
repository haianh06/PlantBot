from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

from app.db.base_model import Base
class sensor_data(Base):
    __tablename__ = "sensor_data"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    
    pass



