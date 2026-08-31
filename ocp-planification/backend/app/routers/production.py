from app.models.tranchee import Tranchee, EtatTranchee
from app.models.panneau import Panneau
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from typing import List, Optional

from app.database import get_db
from app.models.production_mensuelle import ProductionMensuelle
from app.models.programme import Programme
from app.schemas.production import ProductionOut, RealiseUpdate
from app.security import get_current_user, require_admin
from app.services.import_excel import importer_production

router = APIRouter(prefix="/production", tags=["Production mensuelle"])


@router.post("/import/{programme_id}")
async def importer(
    programme_id: int,
    fichier: UploadFile = File(...),
    db: Session = Depends(get_db),
    admin=Depends(require_admin),
):
    programme = db.query(Programme).filter(Programme.id == programme_id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme introuvable.")

    if not fichier.filename.endswith((".xlsx", ".xls")):
        raise HTTPException(status_code=400, detail="Le fichier doit être un Excel (.xlsx).")

    contenu = await fichier.read()
    try:
        resultat = importer_production(contenu, programme_id, db)
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Erreur de lecture : {str(e)}")

    return {"message": "Import réussi", **resultat}


@router.get("/{programme_id}", response_model=List[ProductionOut])
def liste(programme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return (
        db.query(ProductionMensuelle)
        .filter(ProductionMensuelle.programme_id == programme_id)
        .order_by(ProductionMensuelle.mois, ProductionMensuelle.id)
        .all()
    )


@router.patch("/{production_id}/realise", response_model=ProductionOut)
def maj_realise(production_id: int, payload: RealiseUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    prod = db.query(ProductionMensuelle).filter(ProductionMensuelle.id == production_id).first()
    if not prod:
        raise HTTPException(status_code=404, detail="Ligne introuvable.")
    prod.valeur_realisee = payload.valeur_realisee
    db.commit()
    db.refresh(prod)
    return prod

@router.get("/{programme_id}/dashboard")
def dashboard(programme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    """Données agrégées pour le tableau de bord analytique."""
    prods = db.query(ProductionMensuelle).filter(
        ProductionMensuelle.programme_id == programme_id
    ).all()

    # KPIs globaux
    total_prevu = sum(p.valeur_prevue or 0 for p in prods)
    total_realise = sum(p.valeur_realisee or 0 for p in prods)
    taux = round((total_realise / total_prevu * 100), 1) if total_prevu else 0

    # Prévu vs réalisé par mois
    par_mois = {}
    for p in prods:
        key = p.mois.isoformat()
        if key not in par_mois:
            par_mois[key] = {"prevu": 0, "realise": 0}
        par_mois[key]["prevu"] += p.valeur_prevue or 0
        par_mois[key]["realise"] += p.valeur_realisee or 0

    # Répartition par section (prévu seulement)
    par_section = {}
    for p in prods:
        s = p.section or "Autre"
        par_section[s] = par_section.get(s, 0) + (p.valeur_prevue or 0)

    # État des tranchées (tous les panneaux du programme)
    tranchees = (
        db.query(Tranchee)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .all()
    )
    etats = {"non_commence": 0, "en_cours": 0, "epuise": 0}
    for t in tranchees:
        etats[t.etat.value] = etats.get(t.etat.value, 0) + 1

    return {
        "kpis": {
            "total_prevu": round(total_prevu, 2),
            "total_realise": round(total_realise, 2),
            "taux_accomplissement": taux,
            "unite": prods[0].unite if prods else "Ktsm",
        },
        "par_mois": [
            {"mois": k, "prevu": round(v["prevu"], 2), "realise": round(v["realise"], 2)}
            for k, v in sorted(par_mois.items())
        ],
        "par_section": [
            {"section": k, "valeur": round(v, 2)}
            for k, v in par_section.items()
        ],
        "tranchees_etats": etats,
    }