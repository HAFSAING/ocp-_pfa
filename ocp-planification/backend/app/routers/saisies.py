from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List

from app.database import get_db
from app.models.saisie_mensuelle import SaisieMensuelle
from app.models.tranchee import Tranchee
from app.models.resultat import Resultat
from app.schemas.saisie_mensuelle import SaisieCreate, SaisieOut
from app.security import get_current_user
from app.services.moteur_calcul import charger_parametres, calculer

router = APIRouter(prefix="/saisies", tags=["Saisies mensuelles"])


@router.get("/", response_model=List[SaisieOut])
def liste(db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(SaisieMensuelle).all()


@router.post("/", response_model=SaisieOut, status_code=201)
def creer(payload: SaisieCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tranchee = db.query(Tranchee).filter(Tranchee.id == payload.tranchee_id).first()
    if not tranchee:
        raise HTTPException(status_code=404, detail="Tranchée introuvable.")

    saisie = SaisieMensuelle(**payload.model_dump(), contributeur_id=user.id)
    db.add(saisie)
    db.commit()
    db.refresh(saisie)

    # Calcul automatique
    params = charger_parametres(db)
    resultats = calculer(tranchee, saisie, params)

    resultat = Resultat(saisie_id=saisie.id, **resultats)
    db.add(resultat)
    db.commit()

    return saisie


@router.get("/{saisie_id}/resultat")
def get_resultat(saisie_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    resultat = db.query(Resultat).filter(Resultat.saisie_id == saisie_id).first()
    if not resultat:
        raise HTTPException(status_code=404, detail="Aucun résultat calculé.")
    return resultat