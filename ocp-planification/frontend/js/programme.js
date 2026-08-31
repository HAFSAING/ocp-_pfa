const tbody = document.getElementById("tbody");
const formWrap = document.getElementById("form-wrap");
const form = document.getElementById("programme-form");

document.getElementById("toggle-form").addEventListener("click", () => {
  formWrap.hidden = !formWrap.hidden;
});
document.getElementById("cancel-btn").addEventListener("click", () => {
  formWrap.hidden = true;
  form.reset();
});

function showAlert(message, type) {
  document.getElementById("alert-zone").innerHTML =
    `<div class="alert-inline is-${type}">${message}</div>`;
  setTimeout(() => { document.getElementById("alert-zone").innerHTML = ""; }, 4000);
}

async function chargerProgrammes() {
  const data = await apiGet("/programmes/");
  if (!data || data.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;color:var(--text-faint);padding:28px;">Aucun programme enregistré</td></tr>`;
    return;
  }
  tbody.innerHTML = data.map((p) => `
    <tr>
      <td class="cell-code">${p.annee}</td>
      <td>${p.mine || "—"}</td>
      <td>${p.section || "—"}</td>
      <td>${p.profil || "—"}</td>
      <td class="cell-num">${p.tonnage_objectif ?? "—"}</td>
      <td>${p.unite || "—"}</td>
      <td class="cell-actions"><button class="btn-danger-text" onclick="supprimerProgramme(${p.id})">Supprimer</button></td>
    </tr>`).join("");
}

async function supprimerProgramme(id) {
  if (!confirm("Supprimer ce programme ?")) return;
  const res = await apiDelete(`/programmes/${id}`);
  if (res && res.ok) { showAlert("Programme supprimé.", "success"); chargerProgrammes(); }
  else showAlert("Suppression impossible.", "error");
}

form.addEventListener("submit", async (e) => {
  e.preventDefault();
  const body = {
    mine: document.getElementById("mine").value || null,
    annee: parseInt(document.getElementById("annee").value),
    section: document.getElementById("section").value || null,
    profil: document.getElementById("profil").value || null,
    tonnage_objectif: parseFloat(document.getElementById("tonnage").value) || null,
    unite: document.getElementById("unite").value || null,
  };
  const res = await apiPost("/programmes/", body);
  if (res && res.ok) {
    showAlert("Programme créé.", "success");
    form.reset();
    formWrap.hidden = true;
    chargerProgrammes();
  } else {
    const err = res ? await res.json() : {};
    showAlert(err.detail || "Création impossible.", "error");
  }
});

chargerProgrammes();