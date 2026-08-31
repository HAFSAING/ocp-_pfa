from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TypeEvenement(str, enum.Enum):
    pluie = "pluie"
    panne_bull = "panne_bull"
    panne_sondeuse = "panne_sondeuse"
    arret_technique = "arret_technique"
    autre = "autre"


class EvenementPerturbateur(Base):
    __tablename__ = "evenements_perturbateurs"

    id = Column(Integer, primary_key=True, index=True)
    tache_id = Column(Integer, ForeignKey("taches_gantt.id"), nullable=False)

    type_evenement = Column(Enum(TypeEvenement), nullable=False)
    date_debut = Column(Date, nullable=False)
    date_fin = Column(Date, nullable=True)
    impact_jours = Column(Float, nullable=False, default=0)
    commentaire = Column(String(500), nullable=True)

    date_creation = Column(DateTime(timezone=True), server_default=func.now())

    tache = relationship("TacheGantt", back_populates="evenements")