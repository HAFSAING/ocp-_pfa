const tbody = document.getElementById("tbody");
const formWrap = document.getElementById("form-wrap");
const form = document.getElementById("panneau-form");
const programmeSelect = document.getElementById("programme-select");
const toggleBtn = document.getElementById("toggle-form");
let programmeActuel = null;

function showAlert(message, type) {
  document.getElementById("alert-zone").innerHTML =
    `<div class="alert-inline is-${type}">${message}</div>`;
  setTimeout(() => { document.getElementById("alert-zone").innerHTML = ""; }, 4000);
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
  programmeActuel = programmeSelect.value;
  toggleBtn.disabled = false;
  chargerPanneaux();
});

toggleBtn.addEventListener("click", () => { formWrap.hidden = !formWrap.hidden; });
document.getElementById("cancel-btn").addEventListener("click", () => { formWrap.hidden = true; form.reset(); });

async function chargerPanneaux() {
  if (!programmeActuel) return;
  const data = await apiGet(`/panneaux/?programme_id=${programmeActuel}`);
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="3" style="text-align:center;color:var(--text-faint);padding:28px;">Aucun panneau pour ce programme</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((p) => `
    <tr>
      <td class="cell-code">${p.code_pan}</td>
      <td>${p.tranchee_label || "—"}</td>
      <td class="cell-actions">
        <a href="tranchees.html?panneau_id=${p.id}" class="btn-icon-text">Gérer les tranchées</a>
        <button class="btn-danger-text" onclick="supprimerPanneau(${p.id})">Supprimer</button>
      </td>
    </tr>`).join("");
}

async function supprimerPanneau(id) {
  if (!confirm("Supprimer ce panneau et toutes ses tranchées ?")) return;
  const res = await apiDelete(`/panneaux/${id}`);
  if (res && res.ok) { showAlert("Panneau supprimé.", "success"); chargerPanneaux(); }
  else showAlert("Suppression impossible.", "error");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    programme_id: parseInt(programmeActuel),
    code_pan: document.getElementById("code_pan").value,
    tranchee_label: document.getElementById("tranchee_label").value || null,
  };
  const res = await apiPost("/panneaux/", body);
  if (res && res.ok) {
    showAlert("Panneau créé.", "success"); form.reset(); formWrap.hidden = true; chargerPanneaux();
  } else {
    const err = res ? await res.json() : {};
    showAlert(err.detail || "Création impossible.", "error");
  }
});

chargerProgrammes();