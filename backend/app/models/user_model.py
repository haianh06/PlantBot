from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy import String
from app.db.base_model import Base
class user(Base):
    __tablename__ = "users"
    
    id: Mapped[int] = mapped_column(primary_key=True)
    pass



