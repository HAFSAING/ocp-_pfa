from sqlalchemy import Column, Integer, Float, Date, ForeignKey, DateTime, String
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from app.database import Base


class Execution(Base):
    __tablename__ = "executions"

    id = Column(Integer, primary_key=True, index=True)
    tranchee_id = Column(Integer, ForeignKey("tranchees.id"), nullable=False)

    date_debut_reel = Column(Date, nullable=True)
    date_fin_reel = Column(Date, nullable=True)
    volume_realise = Column(Float, nullable=True)
    avancement_pct = Column(Float, nullable=True)
    type_evenement = Column(String(80), nullable=True)
    impact_jours = Column(Float, nullable=True)
    commentaire = Column(String(500), nullable=True)

    date_maj = Column(DateTime(timezone=True), server_default=func.now())

    tranchee = relationship("Tranchee")