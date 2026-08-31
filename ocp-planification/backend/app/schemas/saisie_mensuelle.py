from pydantic import BaseModel
from typing import Optional
from datetime import date


class SaisieCreate(BaseModel):
    tranchee_id: int
    mois: date
    cadence: Optional[float] = None
    rendement_d11: Optional[float] = None
    rendement_foration: Optional[float] = None
    dosage_ammonix: Optional[float] = None
    densite: Optional[float] = None


class SaisieOut(SaisieCreate):
    id: int
    contributeur_id: int

    class Config:
        from_attributes = True