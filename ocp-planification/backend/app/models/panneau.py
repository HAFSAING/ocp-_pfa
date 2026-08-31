from sqlalchemy import Column, Integer, String, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class Panneau(Base):
    __tablename__ = "panneaux"

    id = Column(Integer, primary_key=True, index=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=False)

    code_pan = Column(String(80), nullable=False)      # ex : T14B/P3
    tranchee_label = Column(String(50), nullable=True)  # optionnel

    programme = relationship("Programme")
    tranchees = relationship("Tranchee", back_populates="panneau", cascade="all, delete-orphan")