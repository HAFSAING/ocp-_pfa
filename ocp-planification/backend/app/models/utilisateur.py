from sqlalchemy import Column, Integer, String, Enum
from app.database import Base
import enum

class RoleEnum(str, enum.Enum):
    admin = "admin"
    contributeur = "contributeur"
    viewer = "viewer"

class Utilisateur(Base):
    __tablename__ = "utilisateurs"

    id = Column(Integer, primary_key=True, index=True)
    nom_complet = Column(String(150), nullable=False)
    email = Column(String(150), unique=True, index=True, nullable=False)
    mot_de_passe_hash = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False, default=RoleEnum.contributeur)