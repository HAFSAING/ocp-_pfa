from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class SaisieMensuelle(Base):
    __tablename__ = "saisies_mensuelles"

    id = Column(Integer, primary_key=True, index=True)
    tranchee_id = Column(Integer, ForeignKey("tranchees.id"), nullable=False)
    contributeur_id = Column(Integer, ForeignKey("utilisateurs.id"), nullable=False)

    mois = Column(Date, nullable=False)

    cadence = Column(Float, nullable=True)
    rendement_d11 = Column(Float, nullable=True)
    rendement_foration = Column(Float, nullable=True)
    dosage_ammonix = Column(Float, nullable=True)
    densite = Column(Float, nullable=True)

    date_saisie = Column(DateTime(timezone=True), server_default=func.now())

    tranchee = relationship("Tranchee", back_populates="saisies")
    contributeur = relationship("Utilisateur")