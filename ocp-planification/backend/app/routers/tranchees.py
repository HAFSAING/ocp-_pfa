from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.tranchee import Tranchee, EtatTranchee
from app.schemas.tranchee import TrancheeCreate, TrancheeOut
from app.security import get_current_user, require_admin

router = APIRouter(prefix="/tranchees", tags=["Tranchées"])


@router.get("/", response_model=List[TrancheeOut])
def liste(
    panneau_id: Optional[int] = None,
    non_epuise: Optional[bool] = False,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    query = db.query(Tranchee)
    if panneau_id:
        query = query.filter(Tranchee.panneau_id == panneau_id)
    if non_epuise:
        query = query.filter(Tranchee.etat != EtatTranchee.epuise)
    return query.order_by(Tranchee.ordre_execution.asc().nullslast()).all()


@router.post("/", response_model=TrancheeOut, status_code=201)
def creer(payload: TrancheeCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    tranchee = Tranchee(**payload.model_dump())
    db.add(tranchee)
    db.commit()
    db.refresh(tranchee)
    return tranchee


@router.patch("/{tranchee_id}/etat", response_model=TrancheeOut)
def changer_etat(tranchee_id: int, etat: EtatTranchee, db: Session = Depends(get_db), admin=Depends(require_admin)):
    tranchee = db.query(Tranchee).filter(Tranchee.id == tranchee_id).first()
    if not tranchee:
        raise HTTPException(status_code=404, detail="Tranchée introuvable.")
    tranchee.etat = etat
    db.commit()
    db.refresh(tranchee)
    return tranchee


@router.delete("/{tranchee_id}", status_code=204)
def supprimer(tranchee_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    tranchee = db.query(Tranchee).filter(Tranchee.id == tranchee_id).first()
    if not tranchee:
        raise HTTPException(status_code=404, detail="Tranchée introuvable.")
    db.delete(tranchee)
    db.commit()