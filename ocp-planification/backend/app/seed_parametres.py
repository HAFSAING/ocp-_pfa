"""
Initialise les paramètres de calcul avec des valeurs d'exemple.
Ces valeurs sont AJUSTABLES ensuite via l'application.
À lancer une seule fois : python -m app.seed_parametres
"""

from app.database import SessionLocal
from app.models.parametre_calcul import ParametreCalcul

# Valeurs d'exemple — à confirmer/ajuster avec le bureau géologie
PARAMETRES_DEFAUT = [
    {"nom": "coef_MT", "valeur": 0.96, "unite": "", "description": "Coefficient couche MT (exemple, à confirmer)"},
    {"nom": "coef_BT", "valeur": 0.90, "unite": "", "description": "Coefficient couche BT (exemple, à confirmer)"},
    {"nom": "coef_TBT", "valeur": 0.80, "unite": "", "description": "Coefficient couche TBT (exemple, à confirmer)"},
    {"nom": "densite_sterile", "valeur": 1.8, "unite": "t/m3", "description": "Densité du stérile (exemple)"},
    {"nom": "densite_phosphate", "valeur": 2.0, "unite": "t/m3", "description": "Densité du phosphate (exemple)"},
    {"nom": "foisonnement", "valeur": 1.17, "unite": "", "description": "Coefficient de foisonnement (exemple)"},
]


def seed():
    db = SessionLocal()
    try:
        for p in PARAMETRES_DEFAUT:
            existe = db.query(ParametreCalcul).filter(ParametreCalcul.nom == p["nom"]).first()
            if existe:
                print(f"  = {p['nom']} existe déjà, ignoré")
                continue
            db.add(ParametreCalcul(**p))
            print(f"  + {p['nom']} = {p['valeur']} ajouté")
        db.commit()
        print("\nParamètres initialisés.")
    finally:
        db.close()


if __name__ == "__main__":
    seed()