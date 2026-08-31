from pydantic import BaseModel
from typing import Optional


class PanneauCreate(BaseModel):
    programme_id: int
    code_pan: str
    tranchee_label: Optional[str] = None


class PanneauOut(PanneauCreate):
    id: int

    class Config:
        from_attributes = True