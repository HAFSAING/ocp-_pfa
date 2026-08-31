from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.programme import Programme
from app.schemas.programme import ProgrammeCreate, ProgrammeOut
from app.security import get_current_user, require_admin

router = APIRouter(prefix="/programmes", tags=["Programmes"])


@router.get("/", response_model=List[ProgrammeOut])
def liste(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(Programme).all()


@router.post("/", response_model=ProgrammeOut, status_code=201)
def creer(payload: ProgrammeCreate, db: Session = Depends(get_db), admin=Depends(require_admin)):
    prog = Programme(**payload.model_dump())
    db.add(prog)
    db.commit()
    db.refresh(prog)
    return prog


@router.delete("/{programme_id}", status_code=204)
def supprimer(programme_id: int, db: Session = Depends(get_db), admin=Depends(require_admin)):
    prog = db.query(Programme).filter(Programme.id == programme_id).first()
    if not prog:
        raise HTTPException(status_code=404, detail="Programme introuvable.")
    db.delete(prog)
    db.commit()