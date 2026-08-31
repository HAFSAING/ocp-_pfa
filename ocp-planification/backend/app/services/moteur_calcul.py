"""
Moteur de calcul — transforme les données saisies en résultats,
en appliquant les formules du bureau géologie.

Les coefficients (MT/BT/TBT, densités, foisonnement) sont lus depuis
la table parametres_calcul → ajustables sans toucher au code.

⚠️ Les formules ci-dessous reprennent les notes manuscrites.
Certaines valeurs/coefficients sont des EXEMPLES à confirmer avec le bureau.
"""

from sqlalchemy.orm import Session
from app.models.parametre_calcul import ParametreCalcul
from app.models.panneau import Panneau
from app.models.saisie_mensuelle import SaisieMensuelle


def charger_parametres(db: Session) -> dict:
    """Charge tous les coefficients paramétrables dans un dictionnaire."""
    params = db.query(ParametreCalcul).all()
    return {p.nom: p.valeur for p in params}


def coef_couche(profil: str, params: dict) -> float:
    """Retourne le coefficient de la couche selon le profil (MT/BT/TBT)."""
    if not profil:
        return 1.0
    cle = f"coef_{profil.strip().upper()}"
    return params.get(cle, 1.0)


def calculer(tranchee, saisie: SaisieMensuelle, params: dict) -> dict:
    """
    Applique les formules et retourne un dictionnaire de résultats.
    Aucune écriture en base ici — juste le calcul pur (facile à tester).
    """
    # --- Récupération des entrées (avec valeurs par défaut sûres) ---
    L = panneau.longueur_m or 0
    l = panneau.largeur_m or 0
    p_sterile = panneau.puissance_sterile_m or 0
    p_phosphate = panneau.puissance_phosphate_m or 0
    maille = panneau.maille_foration or 0

    densite_ph = params.get("densite_phosphate", 2.0)
    foisonnement = params.get("foisonnement", 1.17)
    coef = coef_couche(panneau.profil, params)

    rendement_d11 = saisie.rendement_d11 or 0        # m3/h
    rendement_for = saisie.rendement_foration or 0   # ml/h
    dosage = saisie.dosage_ammonix or 0              # g/m3

    # --- Formules ---

    # Surface : S = L × l
    surface = L * l

    # Volume stérile : V_ST = S × puissance_stérile
    volume_sterile = surface * p_sterile

    # Volume phosphate : V_PH = L × l × puissance_phosphate
    volume_phosphate = L * l * p_phosphate

    # Tonnage phosphate (TSM) : Vph × densité × coef_couche
    tonnage_phosphate_tsm = volume_phosphate * densite_ph * coef

    # Volume mouvementé : V_en_place × foisonnement
    volume_mouvemente = volume_sterile * foisonnement

    # HMB (heures machine bull) : Volume à décaper / rendement décapage
    hmb = (volume_sterile / rendement_d11) if rendement_d11 else 0

    # ML à forer : profondeur totale × nombre de trous
    #   Nb trous = Surface / maille
    nbr_trous = (surface / maille) if maille else 0
    profondeur = p_sterile + p_phosphate
    ml_a_forer = nbr_trous * profondeur

    # HM sondeuse : ml à forer / rendement foration
    hm_sondeuse = (ml_a_forer / rendement_for) if rendement_for else 0

    # Quantité Ammonix : dosage × volume à sauter
    #   (volume à sauter ≈ volume stérile ici, à ajuster selon besoin)
    quantite_ammonix = (dosage * volume_sterile) / 1000  # g → kg

    # Jours prévus : HMB / heures par jour (ex. 20h/jour, paramétrable plus tard)
    heures_par_jour = params.get("heures_par_jour", 20)
    jours_prevus = (hmb / heures_par_jour) if heures_par_jour else 0

    return {
        "surface": round(surface, 2),
        "volume_sterile": round(volume_sterile, 2),
        "volume_phosphate": round(volume_phosphate, 2),
        "tonnage_phosphate_tsm": round(tonnage_phosphate_tsm, 2),
        "volume_mouvemente": round(volume_mouvemente, 2),
        "hmb": round(hmb, 2),
        "nbr_trous": round(nbr_trous, 2),
        "ml_a_forer": round(ml_a_forer, 2),
        "hm_sondeuse": round(hm_sondeuse, 2),
        "quantite_ammonix": round(quantite_ammonix, 2),
        "jours_prevus": round(jours_prevus, 2),
    }