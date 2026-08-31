// Récupère le panneau_id depuis l'URL
const params = new URLSearchParams(window.location.search);
const panneauId = params.get("panneau_id");

const tbody = document.getElementById("tbody");
const formWrap = document.getElementById("form-wrap");
const form = document.getElementById("tranchee-form");

const ETAT_LABELS = {
  non_commence: "Non commencé",
  en_cours: "En cours",
  epuise: "Épuisé",
};

const ETAT_COULEURS = {
  non_commence: "#9db0bf",
  en_cours: "#13a538",
  epuise: "#e27954",
};

function showAlert(message, type) {
  document.getElementById("alert-zone").innerHTML =
    `<div class="alert-inline is-${type}">${message}</div>`;
  setTimeout(() => { document.getElementById("alert-zone").innerHTML = ""; }, 4000);
}

if (!panneauId) {
  document.getElementById("panneau-info").textContent = "Aucun panneau sélectionné. Retourne à la page Panneaux.";
  document.getElementById("toggle-form").disabled = true;
}

document.getElementById("toggle-form").addEventListener("click", () => { formWrap.hidden = !formWrap.hidden; });
document.getElementById("cancel-btn").addEventListener("click", () => { formWrap.hidden = true; form.reset(); });

function num(id) { const v = parseFloat(document.getElementById(id).value); return isNaN(v) ? null : v; }
function int(id) { const v = parseInt(document.getElementById(id).value); return isNaN(v) ? null : v; }
function txt(id) { return document.getElementById(id).value || null; }

async function chargerTranchees() {
  if (!panneauId) return;
  const data = await apiGet(`/tranchees/?panneau_id=${panneauId}`);
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="11" style="text-align:center;color:var(--text-faint);padding:28px;">Aucune tranchée pour ce panneau</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((t) => `
    <tr>
      <td>${t.ordre_execution ? `<span class="order-badge">${t.ordre_execution}</span>` : "—"}</td>
      <td class="cell-code">${t.code}</td>
      <td>${t.profil || "—"}</td>
      <td>
        <span style="display:inline-flex;align-items:center;gap:6px;font-size:12px;">
          <span style="width:8px;height:8px;border-radius:50%;background:${ETAT_COULEURS[t.etat]};"></span>
          ${ETAT_LABELS[t.etat]}
        </span>
      </td>
      <td class="cell-num">${t.longueur_m ?? "—"}</td>
      <td class="cell-num">${t.largeur_m ?? "—"}</td>
      <td class="cell-num">${t.hauteur_m ?? "—"}</td>
      <td class="cell-num">${t.puissance_sterile_m ?? "—"}</td>
      <td class="cell-num">${t.puissance_phosphate_m ?? "—"}</td>
      <td>${t.machine_foration || "—"}</td>
      <td class="cell-actions">
        <select onchange="changerEtat(${t.id}, this.value)" style="font-size:12px;padding:4px 6px;border-radius:4px;border:1px solid var(--border);">
          <option value="">Changer état…</option>
          <option value="non_commence">Non commencé</option>
          <option value="en_cours">En cours</option>
          <option value="epuise">Épuisé</option>
        </select>
        <button class="btn-danger-text" onclick="supprimerTranchee(${t.id})">Suppr.</button>
      </td>
    </tr>`).join("");
}

async function changerEtat(id, etat) {
  if (!etat) return;
  const res = await apiFetch(`/tranchees/${id}/etat?etat=${etat}`, { method: "PATCH" });
  if (res && res.ok) { showAlert("État mis à jour.", "success"); chargerTranchees(); }
  else showAlert("Modification impossible.", "error");
}

async function supprimerTranchee(id) {
  if (!confirm("Supprimer cette tranchée ?")) return;
  const res = await apiDelete(`/tranchees/${id}`);
  if (res && res.ok) { showAlert("Tranchée supprimée.", "success"); chargerTranchees(); }
  else showAlert("Suppression impossible.", "error");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    panneau_id: parseInt(panneauId),
    code: document.getElementById("code").value,
    profil: txt("profil"),
    longueur_m: num("longueur_m"), largeur_m: num("largeur_m"), hauteur_m: num("hauteur_m"),
    puissance_sterile_m: num("puissance_sterile_m"), puissance_phosphate_m: num("puissance_phosphate_m"),
    distance_transport_m: num("distance_transport_m"), maille_foration: num("maille_foration"),
    machine_foration: txt("machine_foration"), nbr_bull: int("nbr_bull"),
    ordre_execution: int("ordre_execution"), etat: document.getElementById("etat").value,
  };
  const res = await apiPost("/tranchees/", body);
  if (res && res.ok) {
    showAlert("Tranchée créée.", "success"); form.reset(); formWrap.hidden = true; chargerTranchees();
  } else {
    const err = res ? await res.json() : {};
    showAlert(err.detail || "Création impossible.", "error");
  }
});

chargerTranchees();