from sqlalchemy import Column, Integer, String, Float, Date, ForeignKey, Enum, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base
import enum


class TypeTache(str, enum.Enum):
    decapage = "decapage"
    foration = "foration"
    sautage = "sautage"
    criblage = "criblage"
    transport = "transport"
    reprise = "reprise"


class StatutTache(str, enum.Enum):
    prevu = "prevu"
    en_cours = "en_cours"
    termine = "termine"
    perturbe = "perturbe"


class TacheGantt(Base):
    __tablename__ = "taches_gantt"

    id = Column(Integer, primary_key=True, index=True)
    tranchee_id = Column(Integer, ForeignKey("tranchees.id"), nullable=False)

    type_tache = Column(Enum(TypeTache), nullable=False)
    ordre = Column(Integer, nullable=True)

    date_debut_prevue = Column(Date, nullable=True)
    date_fin_prevue = Column(Date, nullable=True)
    date_debut_reelle = Column(Date, nullable=True)
    date_fin_reelle = Column(Date, nullable=True)
    duree_jours = Column(Float, nullable=True)
    avancement_pct = Column(Float, nullable=True, default=0)

    statut = Column(Enum(StatutTache), nullable=False, default=StatutTache.prevu)
    commentaire = Column(String(500), nullable=True)

    date_creation = Column(DateTime(timezone=True), server_default=func.now())

    tranchee = relationship("Tranchee")
    evenements = relationship("EvenementPerturbateur", back_populates="tache", cascade="all, delete-orphan")