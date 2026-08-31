from sqlalchemy import Column, Integer, String, Float, ForeignKey, Enum
from sqlalchemy.orm import relationship
from app.database import Base
import enum


class EtatTranchee(str, enum.Enum):
    non_commence = "non_commence"
    en_cours = "en_cours"
    epuise = "epuise"


class Tranchee(Base):
    __tablename__ = "tranchees"

    id = Column(Integer, primary_key=True, index=True)
    panneau_id = Column(Integer, ForeignKey("panneaux.id"), nullable=False)

    code = Column(String(80), nullable=False)          # ex : SF, C2m, DSP1
    profil = Column(String(50), nullable=True)          # TBT / BT / MT

    # Dimensions (déplacées depuis Panneau)
    longueur_m = Column(Float, nullable=True)
    largeur_m = Column(Float, nullable=True)
    hauteur_m = Column(Float, nullable=True)
    puissance_sterile_m = Column(Float, nullable=True)
    puissance_phosphate_m = Column(Float, nullable=True)
    distance_transport_m = Column(Float, nullable=True)

    # Planification
    ordre_execution = Column(Integer, nullable=True)
    machine_foration = Column(String(50), nullable=True)
    nbr_bull = Column(Integer, nullable=True)
    maille_foration = Column(Float, nullable=True)

    # État
    etat = Column(Enum(EtatTranchee), nullable=False, default=EtatTranchee.non_commence)

    panneau = relationship("Panneau", back_populates="tranchees")
    saisies = relationship("SaisieMensuelle", back_populates="tranchee")