const programmeSelect = document.getElementById("programme-select");
const fichierInput = document.getElementById("fichier-excel");
const importBtn = document.getElementById("import-btn");
const chartPanel = document.getElementById("chart-panel");
const tablePanel = document.getElementById("table-panel");
const tbody = document.getElementById("tbody");
let chartInstance = null;

const MOIS_COURTS = ["Jan", "Fév", "Mar", "Avr", "Mai", "Juin", "Juil", "Aoû", "Sep", "Oct", "Nov", "Déc"];

function showAlert(message, type) {
  document.getElementById("alert-zone").innerHTML =
    `<div class="alert-inline is-${type}">${message}</div>`;
  setTimeout(() => { document.getElementById("alert-zone").innerHTML = ""; }, 5000);
}

async function chargerProgrammes() {
  const data = await apiGet("/programmes/");
  if (!data) return;
  data.forEach((p) => {
    const opt = document.createElement("option");
    opt.value = p.id;
    opt.textContent = `${p.annee} — ${p.mine || "Sans nom"} ${p.section ? "(" + p.section + ")" : ""}`;
    programmeSelect.appendChild(opt);
  });
}

programmeSelect.addEventListener("change", () => {
  importBtn.disabled = !programmeSelect.value;
  chargerProduction();
});

// --- Import Excel ---
importBtn.addEventListener("click", async () => {
  const programmeId = programmeSelect.value;
  const fichier = fichierInput.files[0];
  if (!programmeId || !fichier) {
    showAlert("Choisis un programme et un fichier.", "error");
    return;
  }

  importBtn.disabled = true;
  importBtn.textContent = "Import...";

  const formData = new FormData();
  formData.append("fichier", fichier);

  const token = getToken();
  try {
    const response = await fetch(`${API_BASE_URL}/production/import/${programmeId}`, {
      method: "POST",
      headers: { "Authorization": `Bearer ${token}` },
      body: formData,
    });
    const data = await response.json();
    if (!response.ok) {
      showAlert(data.detail || "Import impossible.", "error");
    } else {
      showAlert(`Import réussi : ${data.importes} postes, ${data.valeurs} valeurs, ${data.mois} mois (${data.unite}).`, "success");
      chargerProduction();
    }
  } catch {
    showAlert("Erreur serveur pendant l'import.", "error");
  } finally {
    importBtn.disabled = false;
    importBtn.textContent = "Importer";
  }
});

// --- Charger et afficher la production ---
async function chargerProduction() {
  const programmeId = programmeSelect.value;
  if (!programmeId) return;

  const data = await apiGet(`/production/${programmeId}`);
  if (!data || data.length === 0) {
    chartPanel.hidden = true;
    tablePanel.hidden = true;
    return;
  }

  afficherTableau(data);
  afficherGraphique(data);
}

function afficherTableau(data) {
  tablePanel.hidden = false;
  tbody.innerHTML = data.map((p) => {
    const ecart = (p.valeur_realisee != null && p.valeur_prevue != null)
      ? (p.valeur_realisee - p.valeur_prevue).toFixed(2) : "—";
    const ecartColor = ecart !== "—" ? (parseFloat(ecart) < 0 ? "var(--danger)" : "var(--corporate-green)") : "var(--text-faint)";
    const moisDate = new Date(p.mois);
    const moisLabel = `${MOIS_COURTS[moisDate.getMonth()]} ${moisDate.getFullYear()}`;
    return `
      <tr>
        <td style="font-size:12px;">${p.section || "—"}</td>
        <td class="cell-code">${p.poste}</td>
        <td>${moisLabel}</td>
        <td>${p.unite || "—"}</td>
        <td class="cell-num">${p.valeur_prevue ?? "—"}</td>
        <td class="cell-num">
          <input type="number" step="0.01" value="${p.valeur_realisee ?? ""}"
            onchange="majRealise(${p.id}, this.value)"
            style="width:90px;padding:5px;border:1px solid var(--border);border-radius:4px;font-family:var(--font-mono);font-size:12px;text-align:right;">
        </td>
        <td class="cell-num" style="color:${ecartColor};font-weight:600;">${ecart}</td>
      </tr>`;
  }).join("");
}

async function majRealise(id, valeur) {
  const v = parseFloat(valeur);
  if (isNaN(v)) return;
  const res = await apiFetch(`/production/${id}/realise`, {
    method: "PATCH",
    body: JSON.stringify({ valeur_realisee: v }),
  });
  if (res && res.ok) { showAlert("Réalisé mis à jour.", "success"); chargerProduction(); }
  else showAlert("Mise à jour impossible.", "error");
}

// --- Graphique : agrège prévu vs réalisé par mois ---
function afficherGraphique(data) {
  chartPanel.hidden = false;

  // Agrège par mois (somme de tous les postes)
  const parMois = {};
  data.forEach((p) => {
    const key = p.mois;
    if (!parMois[key]) parMois[key] = { prevu: 0, realise: 0 };
    parMois[key].prevu += p.valeur_prevue || 0;
    parMois[key].realise += p.valeur_realisee || 0;
  });

  const moisTries = Object.keys(parMois).sort();
  const labels = moisTries.map((m) => {
    const d = new Date(m);
    return `${MOIS_COURTS[d.getMonth()]}`;
  });
  const prevus = moisTries.map((m) => parMois[m].prevu.toFixed(1));
  const realises = moisTries.map((m) => parMois[m].realise.toFixed(1));

  if (chartInstance) chartInstance.destroy();

  const ctx = document.getElementById("chart-comparaison").getContext("2d");
  chartInstance = new Chart(ctx, {
    type: "bar",
    data: {
      labels: labels,
      datasets: [
        { label: "Prévu", data: prevus, backgroundColor: "#aecc53" },
        { label: "Réalisé", data: realises, backgroundColor: "#13a538" },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

chargerProgrammes();