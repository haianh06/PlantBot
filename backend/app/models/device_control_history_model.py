from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String

from app.db.base_model import Base
class Task(Base):
    __tablename__ = "history"
    pass
    



