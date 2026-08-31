from sqlalchemy import Column, Integer, String, Float
from app.database import Base

class ParametreCalcul(Base):
    __tablename__ = "parametres_calcul"

    id = Column(Integer, primary_key=True, index=True)
    nom = Column(String(80), unique=True, nullable=False)   # coef_MT, coef_BT, densite...
    valeur = Column(Float, nullable=False)
    unite = Column(String(30), nullable=True)
    description = Column(String(255), nullable=True)