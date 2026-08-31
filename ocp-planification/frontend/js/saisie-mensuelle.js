const panneauSelect = document.getElementById("panneau-select");
const form = document.getElementById("saisie-form");
const submitBtn = document.getElementById("submit-btn");
const resultatsPanel = document.getElementById("resultats-panel");
const resultatsGrid = document.getElementById("resultats-grid");

const LABELS = {
  surface: "Surface (m²)", volume_sterile: "Volume stérile (m³)",
  volume_phosphate: "Volume phosphate (m³)", tonnage_phosphate_tsm: "Tonnage phosphate (TSM)",
  volume_mouvemente: "Volume mouvementé (m³)", hmb: "HMB (h)", nbr_trous: "Nbre de trous",
  ml_a_forer: "ML à forer", hm_sondeuse: "HM sondeuse (h)",
  quantite_ammonix: "Ammonix (kg)", jours_prevus: "Jours prévus",
};

function showAlert(message, type) {
  document.getElementById("alert-zone").innerHTML =
    `<div class="alert-inline is-${type}">${message}</div>`;
  setTimeout(() => { document.getElementById("alert-zone").innerHTML = ""; }, 4000);
}

async function chargerPanneaux() {
  const data = await apiGet("/panneaux/");
  if (!data) return;
  data.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.code_pan} ${p.profil ? "(" + p.profil + ")" : ""}`;
    panneauSelect.appendChild(opt);
  });
}

panneauSelect.addEventListener("change", () => { submitBtn.disabled = false; });

function num(id) { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; }

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  submitBtn.disabled = true;
  submitBtn.textContent = "Calcul en cours...";

  const mois = document.getElementById("mois").value + "-01"; // YYYY-MM -> YYYY-MM-01
  const body = {
    panneau_id: parseInt(panneauSelect.value),
    mois: mois,
    cadence: num("cadence"), rendement_d11: num("rendement_d11"),
    rendement_foration: num("rendement_foration"), dosage_ammonix: num("dosage_ammonix"),
    densite: num("densite"),
  };

  const res = await apiPost("/saisies/", body);
  submitBtn.disabled = false;
  submitBtn.textContent = "Calculer et enregistrer";

  if (res && res.ok) {
    const saisie = await res.json();
    showAlert("Saisie enregistrée et calculée.", "success");
    afficherResultats(saisie.id);
  } else {
    const err = res ? await res.json() : {};
    showAlert(err.detail || "Enregistrement impossible.", "error");
  }
});

async function afficherResultats(saisieId) {
  const r = await apiGet(`/saisies/${saisieId}/resultat`);
  if (!r) return;
  resultatsPanel.hidden = false;
  resultatsGrid.innerHTML = Object.keys(LABELS).map((key) => `
    <div class="stat-card">
      <div class="stat-card-head"><div class="stat-card-label">${LABELS[key]}</div></div>
      <div class="stat-card-value">${r[key] ?? "—"}</div>
    </div>`).join("");
}

chargerPanneaux();