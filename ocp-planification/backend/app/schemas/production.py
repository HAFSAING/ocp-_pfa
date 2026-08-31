from pydantic import BaseModel
from typing import Optional
from datetime import date


class ProductionOut(BaseModel):
    id: int
    programme_id: int
    section: Optional[str]
    poste: str
    mois: date
    unite: Optional[str]
    valeur_prevue: Optional[float]
    valeur_realisee: Optional[float]

    class Config:
        from_attributes = True


class RealiseUpdate(BaseModel):
    valeur_realisee: float