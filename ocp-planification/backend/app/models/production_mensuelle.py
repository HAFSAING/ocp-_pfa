from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base


class ProductionMensuelle(Base):
    __tablename__ = "productions_mensuelles"

    id = Column(Integer, primary_key=True, index=True)
    programme_id = Column(Integer, ForeignKey("programmes.id"), nullable=False)

    section = Column(String(120), nullable=True)      # PRODUCTION, Reprise, Stockage...
    poste = Column(String(120), nullable=False)         # LF, EXPORT, Production Bouchane...
    mois = Column(Date, nullable=False)                  # 2025-01-01
    unite = Column(String(30), nullable=True)            # Ktsm

    valeur_prevue = Column(Float, nullable=True)         # depuis Excel / saisie
    valeur_realisee = Column(Float, nullable=True)       # saisie plus tard

    programme = relationship("Programme")