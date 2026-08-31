from pydantic import BaseModel, EmailStr
from app.models.utilisateur import RoleEnum


class UtilisateurCreate(BaseModel):
    nom_complet: str
    email: EmailStr
    password: str
    role: RoleEnum


class UtilisateurOut(BaseModel):
    id: int
    nom_complet: str
    email: EmailStr
    role: RoleEnum

    class Config:
        from_attributes = True


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    utilisateur: UtilisateurOut