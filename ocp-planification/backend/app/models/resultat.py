from sqlalchemy import Column, Integer, Float, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base

class Resultat(Base):
    __tablename__ = "resultats"

    id = Column(Integer, primary_key=True, index=True)
    saisie_id = Column(Integer, ForeignKey("saisies_mensuelles.id"), nullable=False)

    # Calculés par le moteur
    surface = Column(Float, nullable=True)                  # S = L x l
    volume_sterile = Column(Float, nullable=True)
    volume_phosphate = Column(Float, nullable=True)
    tonnage_phosphate_tsm = Column(Float, nullable=True)
    volume_mouvemente = Column(Float, nullable=True)         # x foisonnement
    hmb = Column(Float, nullable=True)                        # heures machine bull
    ml_a_forer = Column(Float, nullable=True)
    hm_sondeuse = Column(Float, nullable=True)
    nbr_trous = Column(Float, nullable=True)
    quantite_ammonix = Column(Float, nullable=True)
    jours_prevus = Column(Float, nullable=True)

    date_calcul = Column(DateTime(timezone=True), server_default=func.now())

    saisie = relationship("SaisieMensuelle")