from app.routers import auth, programmes, panneaux, tranchees, saisies, gantt, production, taches
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.database import engine, Base
from app import models
from app.routers import auth, programmes, panneaux, saisies

app = FastAPI(title="OCP Planification API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

Base.metadata.create_all(bind=engine)

app.include_router(auth.router)
app.include_router(programmes.router)
app.include_router(panneaux.router)
app.include_router(saisies.router)
app.include_router(gantt.router)
app.include_router(tranchees.router)
app.include_router(production.router)
app.include_router(taches.router)

@app.get("/")
def root():
    return {"status": "API opérationnelle", "message": "OCP Planification"}