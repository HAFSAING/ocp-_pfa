from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session
from typing import List, Optional
from datetime import timedelta, date

from app.database import get_db
from app.models.tache_gantt import TacheGantt, TypeTache, StatutTache
from app.models.evenement import EvenementPerturbateur, TypeEvenement
from app.models.tranchee import Tranchee
from app.models.panneau import Panneau
from app.security import get_current_user
from pydantic import BaseModel
from app.services.rapport_pdf import generer_rapport_pdf

router = APIRouter(prefix="/taches", tags=["Tâches Gantt"])


class TacheCreate(BaseModel):
    tranchee_id: int
    type_tache: TypeTache
    ordre: Optional[int] = None
    date_debut_prevue: Optional[date] = None
    duree_jours: Optional[float] = None
    commentaire: Optional[str] = None


class TacheOut(BaseModel):
    id: int
    tranchee_id: int
    type_tache: TypeTache
    ordre: Optional[int]
    date_debut_prevue: Optional[date]
    date_fin_prevue: Optional[date]
    date_debut_reelle: Optional[date]
    date_fin_reelle: Optional[date]
    duree_jours: Optional[float]
    avancement_pct: Optional[float]
    statut: StatutTache
    commentaire: Optional[str]
    impact_total_jours: float = 0

    class Config:
        from_attributes = True


class EvenementCreate(BaseModel):
    tache_id: int
    type_evenement: TypeEvenement
    date_debut: date
    date_fin: Optional[date] = None
    impact_jours: float
    commentaire: Optional[str] = None


class EvenementOut(BaseModel):
    id: int
    tache_id: int
    type_evenement: TypeEvenement
    date_debut: date
    date_fin: Optional[date]
    impact_jours: float
    commentaire: Optional[str]

    class Config:
        from_attributes = True


class AvancementUpdate(BaseModel):
    avancement_pct: float


def _build_tache_out(t: TacheGantt) -> TacheOut:
    impact = sum(e.impact_jours for e in t.evenements)
    return TacheOut(
        id=t.id, tranchee_id=t.tranchee_id, type_tache=t.type_tache,
        ordre=t.ordre, date_debut_prevue=t.date_debut_prevue,
        date_fin_prevue=t.date_fin_prevue, date_debut_reelle=t.date_debut_reelle,
        date_fin_reelle=t.date_fin_reelle, duree_jours=t.duree_jours,
        avancement_pct=t.avancement_pct or 0,
        statut=t.statut, commentaire=t.commentaire, impact_total_jours=impact,
    )


@router.get("/programme/{programme_id}", response_model=List[TacheOut])
def taches_programme(programme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tranchees = (
        db.query(Tranchee)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .all()
    )
    ids = [t.id for t in tranchees]
    taches = db.query(TacheGantt).filter(TacheGantt.tranchee_id.in_(ids)).order_by(TacheGantt.ordre).all()
    return [_build_tache_out(t) for t in taches]


@router.get("/tranchee/{tranchee_id}", response_model=List[TacheOut])
def taches_tranchee(tranchee_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    taches = db.query(TacheGantt).filter(TacheGantt.tranchee_id == tranchee_id).order_by(TacheGantt.ordre).all()
    return [_build_tache_out(t) for t in taches]


@router.post("/", status_code=201)
def creer_tache(payload: TacheCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tache = TacheGantt(**payload.model_dump())
    if payload.date_debut_prevue and payload.duree_jours:
        tache.date_fin_prevue = payload.date_debut_prevue + timedelta(days=max(int(payload.duree_jours)-1, 0))
    db.add(tache)
    db.commit()
    db.refresh(tache)
    return _build_tache_out(tache)


@router.patch("/{tache_id}/statut")
def maj_statut(tache_id: int, statut: StatutTache, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tache = db.query(TacheGantt).filter(TacheGantt.id == tache_id).first()
    if not tache:
        raise HTTPException(404, "Tâche introuvable.")
    tache.statut = statut
    if statut == StatutTache.termine:
        tache.avancement_pct = 100
        if not tache.date_fin_reelle:
            tache.date_fin_reelle = date.today()
    db.commit()
    return {"ok": True}


@router.patch("/{tache_id}/avancement")
def maj_avancement(tache_id: int, payload: AvancementUpdate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tache = db.query(TacheGantt).filter(TacheGantt.id == tache_id).first()
    if not tache:
        raise HTTPException(404, "Tâche introuvable.")
    tache.avancement_pct = max(0, min(100, payload.avancement_pct))
    if tache.avancement_pct >= 100:
        tache.statut = StatutTache.termine
    elif tache.avancement_pct > 0:
        tache.statut = StatutTache.en_cours
    db.commit()
    return {"ok": True, "avancement_pct": tache.avancement_pct}


@router.delete("/{tache_id}", status_code=204)
def supprimer_tache(tache_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tache = db.query(TacheGantt).filter(TacheGantt.id == tache_id).first()
    if not tache:
        raise HTTPException(404, "Tâche introuvable.")
    db.delete(tache)
    db.commit()


@router.post("/evenements/", status_code=201)
def creer_evenement(payload: EvenementCreate, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tache = db.query(TacheGantt).filter(TacheGantt.id == payload.tache_id).first()
    if not tache:
        raise HTTPException(404, "Tâche introuvable.")
    evt = EvenementPerturbateur(**payload.model_dump())
    db.add(evt)
    tache.statut = StatutTache.perturbe
    if tache.date_fin_prevue:
        tache.date_fin_prevue = tache.date_fin_prevue + timedelta(days=int(payload.impact_jours))
    db.commit()
    db.refresh(evt)
    return evt


@router.get("/evenements/{tache_id}", response_model=List[EvenementOut])
def evenements_tache(tache_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    return db.query(EvenementPerturbateur).filter(EvenementPerturbateur.tache_id == tache_id).all()


@router.delete("/evenements/{evt_id}", status_code=204)
def supprimer_evenement(evt_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    evt = db.query(EvenementPerturbateur).filter(EvenementPerturbateur.id == evt_id).first()
    if not evt:
        raise HTTPException(404, "Événement introuvable.")
    db.delete(evt)
    db.commit()


@router.get("/historique/{programme_id}")
def historique_mois(programme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    tranchees = (
        db.query(Tranchee)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .all()
    )
    ids = [t.id for t in tranchees]
    taches = db.query(TacheGantt).filter(TacheGantt.tranchee_id.in_(ids)).all()
    mois_set = set()
    for t in taches:
        if t.date_debut_prevue:
            mois_set.add((t.date_debut_prevue.year, t.date_debut_prevue.month))
        if t.date_fin_prevue:
            mois_set.add((t.date_fin_prevue.year, t.date_fin_prevue.month))
    return sorted([{"annee": y, "mois": m} for y, m in mois_set], key=lambda x: (x["annee"], x["mois"]))


@router.get("/rapport-pdf/{programme_id}")
def rapport_pdf(
    programme_id: int,
    annee: int,
    mois: int,
    db: Session = Depends(get_db),
    user=Depends(get_current_user)
):
    from app.models.programme import Programme
    prog = db.query(Programme).filter(Programme.id == programme_id).first()
    if not prog:
        raise HTTPException(404, "Programme introuvable.")
    buffer = generer_rapport_pdf(programme_id, annee, mois, db)
    nom = f"Rapport_{prog.mine or 'OCP'}_{mois:02d}_{annee}.pdf"
    return StreamingResponse(
        buffer,
        media_type="application/pdf",
        headers={"Content-Disposition": f"attachment; filename={nom}"}
    )