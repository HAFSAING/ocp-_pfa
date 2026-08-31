from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.panneau import Panneau
from app.schemas.panneau import PanneauCreate, PanneauOut
from app.security import get_current_user, require_admin

router = APIRouter(prefix="/panneaux", tags=["Panneaux"])


@router.get("/", response_model=List[PanneauOut])
def liste(programme_id: Optional[int] = None, db: Session = Depends(get_db), user=Depends(get_current_user)):
    query = db.query(Panneau)
    if programme_id:
        query = query.filter(Panneau.programme_id == programme_id)
    return query.all()


@router.post("/", response_model=PanneauOut, status_code=201)
def creer(payload: PanneauCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    panneau = Panneau(**payload.model_dump())
    db.add(panneau)
    db.commit()
    db.refresh(panneau)
    return panneau


@router.delete("/{panneau_id}", status_code=204)
def supprimer(panneau_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    panneau = db.query(Panneau).filter(Panneau.id == panneau_id).first()
    if not panneau:
        raise HTTPException(status_code=404, detail="Panneau introuvable.")
    db.delete(panneau)
    db.commit()