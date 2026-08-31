from pydantic import BaseModel
from typing import Optional


class ProgrammeCreate(BaseModel):
    mine: Optional[str] = None
    annee: int
    section: Optional[str] = None
    profil: Optional[str] = None
    tonnage_objectif: Optional[float] = None
    unite: Optional[str] = None


class ProgrammeOut(ProgrammeCreate):
    id: int

    class Config:
        from_attributes = True