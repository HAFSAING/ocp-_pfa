from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class Programme(Base):
    __tablename__ = "programmes"

    id = Column(Integer, primary_key=True, index=True)
    mine = Column(String(100), nullable=True)
    annee = Column(Integer, nullable=False)
    section = Column(String(100), nullable=True)
    profil = Column(String(100), nullable=True)
    tonnage_objectif = Column(Float, nullable=True)   # objectif annuel
    unite = Column(String(50), nullable=True)