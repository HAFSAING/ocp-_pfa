const programmeSelect = document.getElementById("programme-select");
const panneauSelect = document.getElementById("panneau-select");
const trancheeSelect = document.getElementById("tranchee-select");
const ajouterTacheBtn = document.getElementById("ajouter-tache-btn");
const tacheFormWrap = document.getElementById("tache-form-wrap");
const tacheForm = document.getElementById("tache-form");
const tachesTbody = document.getElementById("taches-tbody");
const evtSection = document.getElementById("evt-section");
const evtFormWrap = document.getElementById("evt-form-wrap");
const evtForm = document.getElementById("evt-form");
const evtTbody = document.getElementById("evt-tbody");

let tacheSelectionnee = null;

const TYPE_LABELS = {
  decapage:"Décapage stérile", foration:"Foration", sautage:"Sautage",
  criblage:"Criblage / Épierrage", transport:"Transport phosphate", reprise:"Reprise",
};
const TYPE_COLORS = {
  decapage:"#c68a3f", foration:"#163e2c", sautage:"#dc3545",
  criblage:"#e27954", transport:"#13a538", reprise:"#9db0bf",
};
const STATUT_CONFIG = {
  prevu:    { label:"Prévu",    color:"var(--cool-grey)" },
  en_cours: { label:"En cours", color:"var(--corporate-green)" },
  termine:  { label:"Terminé",  color:"var(--light-green)" },
  perturbe: { label:"Perturbé", color:"var(--orange)" },
};
const EVT_LABELS = {
  pluie:"Pluie / Intempéries", panne_bull:"Panne bull",
  panne_sondeuse:"Panne sondeuse", arret_technique:"Arrêt technique", autre:"Autre",
};

const SVG_TRASH = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/></svg>`;
const SVG_ALERT = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M10.3 3.9L1.8 18a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 3.9a2 2 0 0 0-3.4 0z"/><line x1="12" y1="9" x2="12" y2="13"/></svg>`;

function showAlert(msg, type) {
  document.getElementById("alert-zone").innerHTML = `<div class="alert-inline is-${type}">${msg}</div>`;
  setTimeout(() => document.getElementById("alert-zone").innerHTML = "", 4000);
}
function fmtDate(d) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit",year:"numeric"});
}

async function chargerProgrammes() {
  const data = await apiGet("/programmes/"); if (!data) return;
  data.forEach(p => {
    const o = document.createElement("option");
    o.value = p.id; o.textContent = `${p.annee} — ${p.mine||""} ${p.section?"("+p.section+")":""}`;
    programmeSelect.appendChild(o);
  });
}

programmeSelect.addEventListener("change", async () => {
  panneauSelect.innerHTML = '<option value="" disabled selected>Sélectionner</option>';
  trancheeSelect.innerHTML = '<option value="" disabled selected>Sélectionner</option>';
  panneauSelect.disabled = false; trancheeSelect.disabled = true;
  ajouterTacheBtn.disabled = true;
  tachesTbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-faint);padding:28px;">Sélectionne un panneau</td></tr>`;
  const data = await apiGet(`/panneaux/?programme_id=${programmeSelect.value}`); if (!data) return;
  data.forEach(p => {
    const o = document.createElement("option"); o.value = p.id; o.textContent = p.code_pan;
    panneauSelect.appendChild(o);
  });
});

panneauSelect.addEventListener("change", async () => {
  trancheeSelect.innerHTML = '<option value="" disabled selected>Sélectionner</option>';
  trancheeSelect.disabled = false;
  const data = await apiGet(`/tranchees/?panneau_id=${panneauSelect.value}`); if (!data) return;
  data.forEach(t => {
    const o = document.createElement("option"); o.value = t.id;
    o.textContent = `${t.code} — ${t.profil||"?"} (${t.etat.replace("_"," ")})`;
    trancheeSelect.appendChild(o);
  });
});

trancheeSelect.addEventListener("change", () => {
  ajouterTacheBtn.disabled = false;
  chargerTaches();
  evtSection.hidden = true;
  tacheSelectionnee = null;
});

ajouterTacheBtn.addEventListener("click", () => { tacheFormWrap.hidden = !tacheFormWrap.hidden; });
document.getElementById("annuler-tache").addEventListener("click", () => { tacheFormWrap.hidden = true; tacheForm.reset(); });

async function chargerTaches() {
  const id = trancheeSelect.value; if (!id) return;
  const data = await apiGet(`/taches/tranchee/${id}`);
  if (!data || data.length === 0) {
    tachesTbody.innerHTML = `<tr><td colspan="9" style="text-align:center;color:var(--text-faint);padding:32px;">Aucune tâche — cliquez "+ Ajouter une tâche".</td></tr>`;
    return;
  }
  const sorted = [...data].sort((a,b) => (a.ordre||99) - (b.ordre||99));
  tachesTbody.innerHTML = sorted.map(t => {
    const impact = t.impact_total_jours || 0;
    const statut = STATUT_CONFIG[t.statut] || { label:t.statut, color:"var(--text-muted)" };
    const couleur = TYPE_COLORS[t.type_tache] || "#9db0bf";
    const pct = t.avancement_pct || 0;
    const isSelected = tacheSelectionnee === t.id;
    const barColor = t.statut==="perturbe" ? "var(--orange)" : t.statut==="termine" ? "var(--light-green)" : "var(--corporate-green)";
    return `
    <tr class="tache-row${isSelected?" selected":""}" onclick="selectionnerTache(${t.id},'${(TYPE_LABELS[t.type_tache]||t.type_tache).replace(/'/g,"\\'")}')">
      <td style="text-align:center;"><span class="order-badge">${t.ordre||"—"}</span></td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px;padding:4px 10px;border-radius:10px;font-size:11px;font-weight:600;font-family:var(--font-mono);background:${couleur}18;color:${couleur};border-left:3px solid ${couleur};">
          ${TYPE_LABELS[t.type_tache]||t.type_tache}
        </span>
      </td>
      <td style="font-family:var(--font-mono);font-size:12px;">${fmtDate(t.date_debut_prevue)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;">${fmtDate(t.date_fin_prevue)}</td>
      <td class="cell-num">${t.duree_jours ? t.duree_jours+" j" : "—"}</td>
      <td>
        <div style="display:flex;align-items:center;gap:8px;">
          <div style="width:65px;height:5px;background:var(--gray-200);border-radius:3px;overflow:hidden;">
            <div style="width:${pct}%;height:100%;background:${barColor};border-radius:3px;"></div>
          </div>
          <span style="font-family:var(--font-mono);font-size:11px;color:var(--text-muted);min-width:28px;">${pct}%</span>
        </div>
      </td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;font-family:var(--font-mono);">
          <span style="width:7px;height:7px;border-radius:50%;background:${statut.color};flex-shrink:0;"></span>
          ${statut.label}
        </span>
      </td>
      <td>
        ${impact > 0
          ? `<span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--orange);background:rgba(226,121,84,0.1);padding:2px 7px;border-radius:8px;">${SVG_ALERT} +${impact} j</span>`
          : '<span style="color:var(--text-faint);font-size:12px;">—</span>'}
      </td>
      <td onclick="event.stopPropagation()">
        <div style="display:flex;gap:5px;align-items:center;flex-wrap:wrap;">
          <select onchange="changerStatut(${t.id},this.value)" style="font-size:11px;padding:3px 5px;border-radius:4px;border:1px solid var(--border);max-width:90px;">
            <option value="">Statut…</option>
            <option value="prevu">Prévu</option>
            <option value="en_cours">En cours</option>
            <option value="termine">Terminé</option>
            <option value="perturbe">Perturbé</option>
          </select>
          <input type="number" min="0" max="100" value="${pct}" title="Avancement (%)"
            onchange="majAvancement(${t.id},this.value)" onclick="event.stopPropagation()"
            style="width:50px;font-size:11px;padding:3px 5px;border-radius:4px;border:1px solid var(--border);font-family:var(--font-mono);">
          <span style="font-size:11px;color:var(--text-muted);">%</span>
          <button class="btn-danger-text" onclick="event.stopPropagation();supprimerTache(${t.id})" title="Supprimer">${SVG_TRASH}</button>
        </div>
      </td>
    </tr>`;
  }).join("");
}

function selectionnerTache(id, label) {
  tacheSelectionnee = id;
  evtSection.hidden = false;
  document.getElementById("evt-titre").textContent = `Événements — ${label}`;
  document.getElementById("evt-sous-titre").textContent = "Arrêts et perturbations sur cette phase";
  chargerEvenements(id);
  chargerTaches();
}

async function changerStatut(id, statut) {
  if (!statut) return;
  const res = await apiFetch(`/taches/${id}/statut?statut=${statut}`, { method:"PATCH" });
  if (res && res.ok) { showAlert("Statut mis à jour.", "success"); chargerTaches(); }
  else showAlert("Erreur de mise à jour.", "error");
}

async function majAvancement(id, valeur) {
  const v = parseFloat(valeur);
  if (isNaN(v)) return;
  const res = await apiFetch(`/taches/${id}/avancement`, {
    method:"PATCH", body: JSON.stringify({ avancement_pct: v })
  });
  if (res && res.ok) { showAlert(`Avancement : ${v}%`, "success"); chargerTaches(); }
}

async function supprimerTache(id) {
  if (!confirm("Supprimer cette tâche et tous ses événements ?")) return;
  const res = await apiDelete(`/taches/${id}`);
  if (res && res.ok) {
    showAlert("Tâche supprimée.", "success");
    chargerTaches(); evtSection.hidden = true; tacheSelectionnee = null;
  } else showAlert("Suppression impossible.", "error");
}

tacheForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    tranchee_id: parseInt(trancheeSelect.value),
    type_tache: document.getElementById("type-tache").value,
    ordre: parseInt(document.getElementById("ordre-tache").value) || null,
    date_debut_prevue: document.getElementById("debut-prevu").value || null,
    duree_jours: parseFloat(document.getElementById("duree-jours").value) || null,
    commentaire: document.getElementById("tache-commentaire").value || null,
  };
  if (!body.type_tache) { showAlert("Choisissez une phase.", "error"); return; }
  const res = await apiPost("/taches/", body);
  if (res && res.ok) {
    showAlert("Tâche ajoutée.", "success"); tacheForm.reset(); tacheFormWrap.hidden = true; chargerTaches();
  } else {
    const err = res ? await res.json() : {};
    showAlert(err.detail || "Création impossible.", "error");
  }
});

document.getElementById("ajouter-evt-btn").addEventListener("click", () => { evtFormWrap.hidden = !evtFormWrap.hidden; });
document.getElementById("annuler-evt").addEventListener("click", () => { evtFormWrap.hidden = true; evtForm.reset(); });

async function chargerEvenements(tacheId) {
  const data = await apiGet(`/taches/evenements/${tacheId}`);
  if (!data || data.length === 0) {
    evtTbody.innerHTML = `<tr><td colspan="6" style="text-align:center;color:var(--text-faint);padding:24px;">Aucun événement signalé pour cette phase</td></tr>`;
    return;
  }
  evtTbody.innerHTML = data.map(e => {
    const EVT_COLORS = {
      pluie:"rgba(13,202,240,0.12)", panne_bull:"rgba(255,193,7,0.15)",
      panne_sondeuse:"rgba(255,193,7,0.15)", arret_technique:"rgba(108,117,125,0.12)", autre:"rgba(108,117,125,0.1)"
    };
    const EVT_TEXT = {
      pluie:"#055160", panne_bull:"#664d03", panne_sondeuse:"#664d03",
      arret_technique:"#2b2f32", autre:"#495057"
    };
    return `
    <tr>
      <td><span style="display:inline-flex;align-items:center;gap:5px;padding:3px 9px;border-radius:10px;font-size:11px;font-family:var(--font-mono);font-weight:600;background:${EVT_COLORS[e.type_evenement]||'#eee'};color:${EVT_TEXT[e.type_evenement]||'#333'};">${EVT_LABELS[e.type_evenement]||e.type_evenement}</span></td>
      <td style="font-family:var(--font-mono);font-size:12px;">${fmtDate(e.date_debut)}</td>
      <td style="font-family:var(--font-mono);font-size:12px;">${fmtDate(e.date_fin)}</td>
      <td><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;font-family:var(--font-mono);color:var(--orange);background:rgba(226,121,84,0.1);padding:2px 7px;border-radius:8px;">${SVG_ALERT} +${e.impact_jours} j</span></td>
      <td style="font-size:13px;color:var(--text-muted);">${e.commentaire||"—"}</td>
      <td><button class="btn-danger-text" onclick="supprimerEvt(${e.id})" title="Supprimer">${SVG_TRASH}</button></td>
    </tr>`;
  }).join("");
}

evtForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (!tacheSelectionnee) return;
  const body = {
    tache_id: tacheSelectionnee,
    type_evenement: document.getElementById("type-evt").value,
    date_debut: document.getElementById("evt-debut").value,
    date_fin: document.getElementById("evt-fin").value || null,
    impact_jours: parseFloat(document.getElementById("evt-impact").value),
    commentaire: document.getElementById("evt-commentaire").value || null,
  };
  if (!body.date_debut || isNaN(body.impact_jours)) { showAlert("Remplissez la date et l'impact.", "error"); return; }
  const res = await apiPost("/taches/evenements/", body);
  if (res && res.ok) {
    showAlert(`Événement enregistré. +${body.impact_jours} jour(s) de retard ajoutés.`, "success");
    evtForm.reset(); evtFormWrap.hidden = true;
    chargerEvenements(tacheSelectionnee); chargerTaches();
  } else showAlert("Enregistrement impossible.", "error");
});

async function supprimerEvt(id) {
  if (!confirm("Supprimer cet événement ?")) return;
  const res = await apiDelete(`/taches/evenements/${id}`);
  if (res && res.ok) { showAlert("Événement supprimé.", "success"); chargerEvenements(tacheSelectionnee); chargerTaches(); }
}

chargerProgrammes();