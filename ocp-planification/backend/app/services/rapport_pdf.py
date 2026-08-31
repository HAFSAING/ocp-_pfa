from io import BytesIO
from datetime import date
from reportlab.lib.pagesizes import A4, landscape
from reportlab.lib import colors
from reportlab.lib.units import cm
from reportlab.platypus import SimpleDocTemplate, Table, TableStyle, Paragraph, Spacer
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.colors import HexColor
from sqlalchemy.orm import Session

from app.models.panneau import Panneau
from app.models.tranchee import Tranchee, EtatTranchee
from app.models.tache_gantt import TacheGantt
from app.models.programme import Programme

VERT_OCP = HexColor("#163e2c")
VERT_CLAIR = HexColor("#aecc53")

MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin",
           "Juillet","Août","Septembre","Octobre","Novembre","Décembre"]

TYPE_LABELS = {
    "decapage":"Décapage stérile", "foration":"Foration", "sautage":"Sautage",
    "criblage":"Criblage", "transport":"Transport phosphate", "reprise":"Reprise",
}
STATUT_LABELS = {
    "prevu":"Prévu", "en_cours":"En cours", "termine":"Terminé", "perturbe":"Perturbé",
}


def generer_rapport_pdf(programme_id: int, annee: int, mois: int, db: Session) -> BytesIO:
    programme = db.query(Programme).filter(Programme.id == programme_id).first()
    debut_mois = date(annee, mois, 1)
    fin_mois = date(annee, mois+1, 1) if mois < 12 else date(annee+1, 1, 1)

    tranchees = (
        db.query(Tranchee)
        .join(Panneau, Tranchee.panneau_id == Panneau.id)
        .filter(Panneau.programme_id == programme_id)
        .filter(Tranchee.etat != EtatTranchee.epuise)
        .all()
    )
    ids = [t.id for t in tranchees]
    taches = (
        db.query(TacheGantt)
        .filter(TacheGantt.tranchee_id.in_(ids))
        .order_by(TacheGantt.ordre)
        .all()
    )
    taches_mois = [
        t for t in taches
        if t.date_debut_prevue and t.date_fin_prevue
        and t.date_debut_prevue < fin_mois
        and t.date_fin_prevue >= debut_mois
    ]

    buffer = BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=landscape(A4),
        rightMargin=1.5*cm, leftMargin=1.5*cm,
        topMargin=1.5*cm, bottomMargin=1.5*cm
    )

    styles = getSampleStyleSheet()
    titre_style = ParagraphStyle(
        "titre", parent=styles["Title"],
        fontSize=16, textColor=VERT_OCP, spaceAfter=4
    )
    sous_titre_style = ParagraphStyle(
        "sous", parent=styles["Normal"],
        fontSize=10, textColor=colors.grey, spaceAfter=12
    )
    elements = []

    mine = programme.mine if programme else ""
    section = programme.section if programme else ""
    elements.append(Paragraph(f"OCP — Planning mensuel de production — {mine} {section}", titre_style))
    elements.append(Paragraph(f"{MOIS_FR[mois-1]} {annee} | Programme #{programme_id} | Généré le {date.today().strftime('%d/%m/%Y')}", sous_titre_style))
    elements.append(Spacer(1, 0.4*cm))

    # Tableau tâches
    data = [["Ordre","Phase","Tranchée","Début prévu","Fin prévue","Durée (j)","Avancement","Statut","Impact (j)"]]
    for t in taches_mois:
        tranchee = next((tr for tr in tranchees if tr.id == t.tranchee_id), None)
        code_tranchee = tranchee.code if tranchee else f"T{t.tranchee_id}"
        impact = sum(e.impact_jours for e in t.evenements)
        avancement = int(t.avancement_pct or 0)
        data.append([
            str(t.ordre or "—"),
            TYPE_LABELS.get(t.type_tache.value, t.type_tache.value),
            code_tranchee,
            t.date_debut_prevue.strftime("%d/%m/%Y") if t.date_debut_prevue else "—",
            t.date_fin_prevue.strftime("%d/%m/%Y") if t.date_fin_prevue else "—",
            str(int(t.duree_jours)) if t.duree_jours else "—",
            f"{avancement} %",
            STATUT_LABELS.get(t.statut.value, t.statut.value),
            f"+{impact} j" if impact > 0 else "—",
        ])

    if len(data) == 1:
        data.append(["—","Aucune tâche planifiée pour ce mois","","","","","","",""])

    col_widths = [1.2*cm, 4.5*cm, 2.5*cm, 3*cm, 3*cm, 2.2*cm, 2.5*cm, 2.5*cm, 2*cm]
    tableau = Table(data, colWidths=col_widths, repeatRows=1)

    style_tbl = [
        ("BACKGROUND", (0,0), (-1,0), VERT_OCP),
        ("TEXTCOLOR", (0,0), (-1,0), colors.white),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,0), 9),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
        ("FONTSIZE", (0,1), (-1,-1), 8),
        ("GRID", (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING", (0,0), (-1,-1), 6),
        ("BOTTOMPADDING", (0,0), (-1,-1), 6),
    ]
    # Alternance de lignes
    for i in range(1, len(data)):
        if i % 2 == 0:
            style_tbl.append(("BACKGROUND", (0,i), (-1,i), HexColor("#f8f9fa")))
    # Colorer statut perturbé
    for i, row in enumerate(data[1:], 1):
        if row[7] == "Perturbé":
            style_tbl.append(("TEXTCOLOR", (7,i), (7,i), HexColor("#dc3545")))
        if row[7] == "Terminé":
            style_tbl.append(("TEXTCOLOR", (7,i), (7,i), HexColor("#13a538")))

    tableau.setStyle(TableStyle(style_tbl))
    elements.append(tableau)
    elements.append(Spacer(1, 0.6*cm))

    # Résumé statistique
    nb_termine = sum(1 for t in taches_mois if t.statut.value == "termine")
    nb_perturbe = sum(1 for t in taches_mois if t.statut.value == "perturbe")
    nb_en_cours = sum(1 for t in taches_mois if t.statut.value == "en_cours")
    total_impact = sum(sum(e.impact_jours for e in t.evenements) for t in taches_mois)
    avg_avancement = int(sum(t.avancement_pct or 0 for t in taches_mois) / len(taches_mois)) if taches_mois else 0

    elements.append(Paragraph("Résumé du mois", ParagraphStyle("h2", parent=styles["Heading2"], fontSize=11, textColor=VERT_OCP, spaceBefore=6, spaceAfter=6)))

    resume_data = [
        ["Total tâches", "En cours", "Terminées", "Perturbées", "Avancement moyen", "Impact total"],
        [str(len(taches_mois)), str(nb_en_cours), str(nb_termine), str(nb_perturbe), f"{avg_avancement}%", f"+{total_impact} j"],
    ]
    resume = Table(resume_data, colWidths=[4*cm]*6)
    resume_style = [
        ("BACKGROUND", (0,0), (-1,0), HexColor("#f8f9fa")),
        ("FONTNAME", (0,0), (-1,0), "Helvetica-Bold"),
        ("FONTSIZE", (0,0), (-1,-1), 9),
        ("ALIGN", (0,0), (-1,-1), "CENTER"),
        ("GRID", (0,0), (-1,-1), 0.5, HexColor("#dee2e6")),
        ("TOPPADDING", (0,0), (-1,-1), 8),
        ("BOTTOMPADDING", (0,0), (-1,-1), 8),
    ]
    if nb_perturbe > 0:
        resume_style.append(("TEXTCOLOR", (3,1), (3,1), HexColor("#dc3545")))
        resume_style.append(("FONTNAME", (3,1), (3,1), "Helvetica-Bold"))
    if total_impact > 0:
        resume_style.append(("TEXTCOLOR", (5,1), (5,1), HexColor("#e27954")))
    resume.setStyle(TableStyle(resume_style))
    elements.append(resume)

    doc.build(elements)
    buffer.seek(0)
    return buffer