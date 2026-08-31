# OCP Planification

Plateforme web d'automatisation de la planification et du suivi mensuel de l'exploitation des mines de phosphate, développée dans le cadre d'un stage de Projet de Fin d'Année (PFA) au sein du **Bureau Géologie** du Groupe OCP.

![Python](https://img.shields.io/badge/Python-3.11-blue?logo=python&logoColor=white)
![FastAPI](https://img.shields.io/badge/FastAPI-009688?logo=fastapi&logoColor=white)
![PostgreSQL](https://img.shields.io/badge/PostgreSQL-336791?logo=postgresql&logoColor=white)
![SQLAlchemy](https://img.shields.io/badge/SQLAlchemy-ORM-red)
![License](https://img.shields.io/badge/Statut-Projet%20académique-lightgrey)

---

## Sommaire

- [Contexte](#contexte)
- [Fonctionnalités](#fonctionnalités)
- [Architecture](#architecture)
- [Les 5 niveaux opérationnels](#les-5-niveaux-opérationnels)
- [Modèle de données](#modèle-de-données)
- [Moteur de calcul](#moteur-de-calcul)
- [Prérequis](#prérequis)
- [Installation](#installation)
- [Lancement du projet](#lancement-du-projet)
- [Rôles et permissions](#rôles-et-permissions)
- [Structure du dépôt](#structure-du-dépôt)
- [Difficultés techniques & choix notables](#difficultés-techniques--choix-notables)
- [Perspectives d'évolution](#perspectives-dévolution)
- [Auteure](#auteure)

---

## Contexte

Avant ce projet, la planification mensuelle de l'exploitation minière (décapage, foration, sautage, transport du phosphate) était réalisée manuellement à l'aide de feuilles de calcul : saisie des paramètres opérationnels, recalcul manuel des indicateurs (surfaces, volumes, tonnages, jours de travail), et suivi du planning sans visualisation centralisée.

**OCP Planification** automatise ce processus de bout en bout : saisie unique des données, calculs automatiques fiables, visualisation du planning sous forme de diagramme de Gantt, et tableau de bord de suivi des performances — tout en respectant fidèlement la logique métier du Bureau Géologie.

## Fonctionnalités

- 🔐 **Authentification** avec attribution de rôle (planificateur, contributeur, consultant)
- 🗂️ **Programme annuel (PADT)** : mine, année, section, profil, objectif de tonnage
- 🧱 **Gestion des panneaux et tranchées** d'exploitation
- ✍️ **Saisie mensuelle** des paramètres opérationnels avec **calcul automatique** des résultats
- 📋 **Planification des tâches** par phase de travail (décapage, foration, sautage, transport) avec suivi d'avancement
- ⚠️ **Signalement d'événements/perturbations** (intempéries, pannes) avec impact en jours perdus
- 📊 **Diagramme de Gantt mensuel** (prévu vs réel), export image et Excel
- 📈 **Tableau de bord analytique** type Power BI (production prévue/réalisée, répartition par section, état des tranchées)


## Architecture

```
┌─────────────────────────┐      HTTP / JSON      ┌──────────────────────────┐      SQLAlchemy ORM      ┌────────────────────┐
│   Client Web             │  ───────────────────▶ │   Serveur applicatif      │  ───────────────────────▶ │   Base de données   │
│   HTML / CSS / JavaScript│                        │   FastAPI (Python)        │                            │   PostgreSQL         │
│   nav.js (auth + rôles)  │ ◀───────────────────  │   Moteur de calcul         │ ◀────────────────────────  │   7 tables           │
│   Frappe Gantt v0.6.1    │                        │   APScheduler              │                            │   port 5433           │
└─────────────────────────┘                        └──────────────────────────┘                            └────────────────────┘
```

Un client web volontairement léger (HTML/CSS/JS natif, sans framework front-end lourd) communique avec un serveur FastAPI, qui centralise le moteur de calcul métier et persiste les données dans PostgreSQL via SQLAlchemy.

**Stack technique :**

| Couche | Technologie | Rôle |
|---|---|---|
| Serveur applicatif | FastAPI | API REST, documentation auto-générée |
| Accès aux données | SQLAlchemy (ORM) | Abstraction du modèle relationnel |
| Base de données | PostgreSQL | Persistance des données de planification |
| Ordonnancement | APScheduler | Tâches planifiées intégrées au serveur (préféré à Airflow, plus léger) |
| Authentification | passlib + bcrypt | Hachage sécurisé des mots de passe |
| Client web | HTML / CSS / JavaScript | Interface utilisateur, sans dépendance lourde |
| Visualisation planning | Frappe Gantt (v0.6.1) | Diagramme de Gantt intégré côté client |

## Les 5 niveaux opérationnels

Le modèle métier du bureau est reproduit fidèlement à travers cinq niveaux hiérarchiques :

1. **Programme PADT annuel** — cadre reçu par le bureau (mine, année, section, objectif)
2. **Projet d'exploitation** — panneaux et tranchées
3. **Planification** — saisie mensuelle des paramètres et planification des tâches
4. **Exécution** — suivi de l'avancement, signalement des perturbations
5. **Suivi des performances** — indicateurs et graphiques prévu vs réalisé

## Modèle de données

7 tables relationnelles :

| Table | Rôle |
|---|---|
| `utilisateurs` | Comptes et rôles (planificateur, contributeur, consultant) |
| `programmes` | Programme PADT annuel |
| `panneaux` | Panneaux d'exploitation et tranchées |
| `saisies_mensuelles` | Paramètres opérationnels saisis chaque mois |
| `executions` | Suivi de l'avancement des tâches |
| `parametres_calcul` | Coefficients configurables du moteur de calcul |
| `resultats` | Résultats calculés automatiquement |

## Moteur de calcul

Le module `app/services/moteur_calcul.py` centralise l'ensemble des formules de planification à partir des paramètres saisis mensuellement :

- Surface à exploiter, volume stérile, volume phosphate
- Tonnage (TSM)
- Métrage à forer (ml)
- Quantité d'explosif (Ammonix)
- Heures machine bulldozer (HMB)
- Jours de travail prévus

Ces calculs s'appuient sur **6 coefficients configurables** (`coef_MT`, `coef_BT`, `coef_TBT`, densités, foisonnement), stockés dans `parametres_calcul`. Les valeurs actuelles sont des **exemples de développement**, en attente de validation définitive par le Bureau Géologie.

> Le formulaire de saisie distingue toujours clairement les champs **saisis** par l'utilisateur (dimensions, rendements, dosage) des champs **calculés** automatiquement par le moteur.

## Prérequis

- Python 3.11+
- PostgreSQL (le projet utilise le port **5433**, à adapter selon votre configuration locale)
- pip

## Installation

```bash
# 1. Cloner le dépôt
git clone https://github.com/VOTRE-UTILISATEUR/ocp-planification.git
cd ocp-planification

# 2. Créer et activer un environnement virtuel
python -m venv venv
venv\Scripts\activate        # Windows
# source venv/bin/activate   # macOS / Linux

# 3. Installer les dépendances backend
cd backend
pip install -r requirements.txt --break-system-packages
```

> ⚠️ **Important** : la bibliothèque `bcrypt` doit être figée à la version `4.0.1` (incompatibilité connue avec `passlib==1.7.4`). Cette contrainte est déjà spécifiée dans `requirements.txt`.

### Configuration

Créer un fichier `.env` dans `backend/` (à éditer via un éditeur de code, pas directement dans un terminal, pour éviter les problèmes d'encodage) :

```env
DATABASE_URL=postgresql://<utilisateur>:<mot_de_passe>@localhost:5433/ocp_planification
SECRET_KEY=<votre_cle_secrete>
```

Créer ensuite la base de données PostgreSQL et exécuter les scripts d'initialisation fournis dans `backend/db/`.

## Lancement du projet

**Backend** (à lancer depuis le dossier `backend/`) :

```bash
cd \ocp-planification\backend
venv\Scripts\activate
uvicorn app.main:app --reload
```

**Frontend** (à lancer depuis le dossier `frontend/`) :

```bash
cd frontend
python -m http.server 5500
```

L'application est alors accessible sur `http://localhost:5500`, et l'API sur `http://localhost:8000` (documentation interactive sur `http://localhost:8000/docs`).

## Rôles et permissions

| Rôle | Permissions |
|---|---|
| **Planificateur** | Création du programme annuel, gestion des panneaux/tranchées, validation des tâches, accès complet |
| **Contributeur** | Saisie des paramètres mensuels, signalement des événements/perturbations |
| **Consultant** | Consultation du planning Gantt et du tableau de bord de suivi (lecture seule) |

## Structure du dépôt

```
ocp-planification/
├── backend/
│   ├── main.py
│   ├── app/
│   │   ├── models/          # Modèles SQLAlchemy (7 tables)
│   │   ├── services/
│   │   │   └── moteur_calcul.py
│   │   └── routes/
│   ├── requirements.txt
│   └── .env
├── frontend/
│   ├── index.html
│   ├── assets/
│   │   ├── nav.js           # Garde d'authentification, filtrage par rôle
│   │   └── logos/
│   └── pages/
└── README.md
```

## Difficultés techniques & choix notables

- **Refonte architecturale** : une première version du projet (authentification PostgreSQL, visualisation stratigraphique SVG) a été abandonnée après plusieurs itérations trop complexes, au profit de cette architecture plus simple centrée sur les 5 niveaux opérationnels du bureau.
- **Compatibilité `bcrypt` / `passlib`** : résolue en figeant `bcrypt==4.0.1`.
- **Port PostgreSQL** : `5433` au lieu de `5432`, déjà occupé par une instance Odoo.
- **Ordonnanceur** : APScheduler retenu plutôt qu'Airflow, jugé disproportionné pour les besoins réels.

## Perspectives d'évolution

- [ ] Intégration d'un tableau de bord **Power BI** embarqué
- [ ] **Import / export Excel** (via `openpyxl` / `pandas`)
- [ ] Validation définitive des **coefficients de calcul** avec le Bureau Géologie
- [ ] Renforcement du contrôle des rôles côté serveur
- [ ] Notifications automatiques de rappel de saisie (via APScheduler)

## Auteure

**Hafsa El-Mahdi**
Élève ingénieure — École Nationale des Sciences Appliquées d'Al Hoceima (ENSAH)
Stage PFA — Bureau Géologie, Groupe OCP

---

*Projet académique réalisé dans le cadre d'un stage de Projet de Fin d'Année. Les coefficients de calcul affichés dans ce dépôt sont des valeurs d'exemple et ne reflètent pas nécessairement les paramètres réels utilisés par l'organisme d'accueil.*
