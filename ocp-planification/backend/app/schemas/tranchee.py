from pydantic import BaseModel
from typing import Optional
from app.models.tranchee import EtatTranchee


class TrancheeCreate(BaseModel):
    panneau_id: int
    code: str
    profil: Optional[str] = None
    longueur_m: Optional[float] = None
    largeur_m: Optional[float] = None
    hauteur_m: Optional[float] = None
    puissance_sterile_m: Optional[float] = None
    puissance_phosphate_m: Optional[float] = None
    distance_transport_m: Optional[float] = None
    ordre_execution: Optional[int] = None
    machine_foration: Optional[str] = None
    nbr_bull: Optional[int] = None
    maille_foration: Optional[float] = None
    etat: EtatTranchee = EtatTranchee.non_commence


class TrancheeOut(TrancheeCreate):
    id: int

    class Config:
        from_attributes = True