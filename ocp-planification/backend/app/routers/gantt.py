from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from datetime import date
from typing import Optional

from app.database import get_db
from app.models.programme import Programme
from app.security import get_current_user
from app.services.gantt_service import generer_planning

from fastapi.responses import StreamingResponse
from app.services.export_excel import exporter_programme

router = APIRouter(prefix="/gantt", tags=["Planning Gantt"])


@router.get("/{programme_id}")
def get_gantt(
    programme_id: int,
    date_debut: Optional[date] = None,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    programme = db.query(Programme).filter(Programme.id == programme_id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme introuvable.")

    taches = generer_planning(programme_id, db, date_debut)
    return {
        "programme": {
            "id": programme.id,
            "annee": programme.annee,
            "mine": programme.mine,
            "section": programme.section,
        },
        "taches": taches,
    }

@router.get("/{programme_id}/export-excel")
def export_excel(programme_id: int, db: Session = Depends(get_db), user=Depends(get_current_user)):
    programme = db.query(Programme).filter(Programme.id == programme_id).first()
    if not programme:
        raise HTTPException(status_code=404, detail="Programme introuvable.")

    buffer = exporter_programme(programme_id, db)
    nom_fichier = f"planning_{programme.mine or 'ocp'}_{programme.annee}.xlsx"

    return StreamingResponse(
        buffer,
        media_type="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        headers={"Content-Disposition": f"attachment; filename={nom_fichier}"},
    )