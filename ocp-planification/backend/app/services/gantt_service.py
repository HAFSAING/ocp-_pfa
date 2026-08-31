from sqlalchemy.orm import Session
from datetime import date, timedelta
from app.models.panneau import Panneau
from app.models.tranchee import Tranchee, EtatTranchee
from app.models.tache_gantt import TacheGantt

TYPE_COULEURS = {
    "decapage": "#c68a3f",
    "foration": "#163e2c",
    "sautage": "#dc3545",
    "criblage": "#e27954",
    "transport": "#13a538",
    "reprise": "#9db0bf",
}

TYPE_LABELS = {
    "decapage": "Décapage", "foration": "Foration", "sautage": "Sautage",
    "criblage": "Criblage", "transport": "Transport", "reprise": "Reprise",
}


def generer_planning(programme_id: int, db: Session, date_debut: date = None) -> list:
    if date_debut is None:
        date_debut = date.today()

    # Récupère toutes les tâches des tranchées non épuisées du programme
    taches = (
        db.query(TacheGantt)
        .join(Tranchee, TacheGantt.tranchee_id == Tranchee.id)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .filter(Tranchee.etat != EtatTranchee.epuise)
        .order_by(TacheGantt.ordre.asc().nullslast(), TacheGantt.id)
        .all()
    )

    # Si des tâches existent avec des dates → on les utilise
    # Sinon → planning automatique depuis date_debut
    if taches:
        taches_avec_dates = [t for t in taches if t.date_debut_prevue]
        if taches_avec_dates:
            return _planning_depuis_taches(taches)
        else:
            return _planning_automatique(taches, date_debut)
    else:
        # Pas de tâches → fallback sur les tranchées
        return _planning_depuis_tranchees(programme_id, db, date_debut)


def _planning_depuis_taches(taches) -> list:
    result = []
    for t in taches:
        impact = sum(e.impact_jours for e in t.evenements)
        nom_tranchee = t.tranchee.code if t.tranchee else f"T{t.tranchee_id}"
        panneau = t.tranchee.panneau.code_pan if t.tranchee and t.tranchee.panneau else ""
        debut = t.date_debut_prevue or date.today()
        fin = t.date_fin_prevue or (debut + timedelta(days=int(t.duree_jours or 1) - 1))

        result.append({
            "id": f"tache-{t.id}",
            "name": f"{panneau}/{nom_tranchee} — {TYPE_LABELS.get(t.type_tache.value, t.type_tache.value)}",
            "start": debut.isoformat(),
            "end": fin.isoformat(),
            "progress": 100 if t.statut.value == "termine" else (50 if t.statut.value == "en_cours" else 0),
            "profil": t.type_tache.value,
            "statut": t.statut.value,
            "impact": impact,
            "custom_class": f"type-{t.type_tache.value}" + (" statut-perturbe" if t.statut.value == "perturbe" else ""),
        })
    return result


def _planning_automatique(taches, date_debut) -> list:
    result = []
    curseur = date_debut
    for t in taches:
        duree = int(t.duree_jours or 1)
        impact = sum(e.impact_jours for e in t.evenements)
        debut = curseur
        fin = debut + timedelta(days=duree - 1 + int(impact))
        nom_tranchee = t.tranchee.code if t.tranchee else f"T{t.tranchee_id}"
        panneau = t.tranchee.panneau.code_pan if t.tranchee and t.tranchee.panneau else ""
        result.append({
            "id": f"tache-{t.id}",
            "name": f"{panneau}/{nom_tranchee} — {TYPE_LABELS.get(t.type_tache.value, t.type_tache.value)}",
            "start": debut.isoformat(),
            "end": fin.isoformat(),
            "progress": 0,
            "profil": t.type_tache.value,
            "statut": t.statut.value,
            "impact": impact,
            "custom_class": f"type-{t.type_tache.value}",
        })
        curseur = fin + timedelta(days=1)
    return result


def _planning_depuis_tranchees(programme_id, db, date_debut) -> list:
    tranchees = (
        db.query(Tranchee)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .filter(Tranchee.etat != EtatTranchee.epuise)
        .order_by(Tranchee.ordre_execution.asc().nullslast())
        .all()
    )
    result = []
    curseur = date_debut
    for t in tranchees:
        nom = f"{t.panneau.code_pan}/{t.code}" if t.panneau else t.code
        fin = curseur + timedelta(days=0)
        result.append({
            "id": f"tranchee-{t.id}",
            "name": nom,
            "start": curseur.isoformat(),
            "end": fin.isoformat(),
            "progress": 0,
            "profil": (t.profil or "").upper(),
            "statut": t.etat.value,
            "impact": 0,
            "custom_class": f"profil-{(t.profil or 'default').lower()}",
        })
        curseur = fin + timedelta(days=1)
    return result