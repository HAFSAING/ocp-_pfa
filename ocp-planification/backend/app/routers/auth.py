from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database import get_db
from app.models.utilisateur import Utilisateur
from app.schemas.utilisateur import UtilisateurCreate, UtilisateurOut, LoginRequest, Token
from app.security import hash_password, verify_password, create_access_token

router = APIRouter(prefix="/auth", tags=["Authentification"])


@router.post("/register", response_model=UtilisateurOut, status_code=status.HTTP_201_CREATED)
def register(payload: UtilisateurCreate, db: Session = Depends(get_db)):
    existing = db.query(Utilisateur).filter(Utilisateur.email == payload.email).first()
    if existing:
        raise HTTPException(status_code=400, detail="Un compte existe déjà avec cet e-mail.")

    nouvel_utilisateur = Utilisateur(
        nom_complet=payload.nom_complet,
        email=payload.email,
        mot_de_passe_hash=hash_password(payload.password),
        role=payload.role,
    )
    db.add(nouvel_utilisateur)
    db.commit()
    db.refresh(nouvel_utilisateur)
    return nouvel_utilisateur


@router.post("/login", response_model=Token)
def login(payload: LoginRequest, db: Session = Depends(get_db)):
    utilisateur = db.query(Utilisateur).filter(Utilisateur.email == payload.email).first()

    if not utilisateur or not verify_password(payload.password, utilisateur.mot_de_passe_hash):
        raise HTTPException(status_code=401, detail="E-mail ou mot de passe incorrect.")

    token = create_access_token(data={"sub": str(utilisateur.id), "role": utilisateur.role.value})
    return Token(access_token=token, utilisateur=utilisateur)