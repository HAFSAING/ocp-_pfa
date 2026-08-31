const programmeSelect = document.getElementById("programme-select");
const placeholder = document.getElementById("placeholder");
const kpiGrid = document.getElementById("kpi-grid");
const chartsRow = document.getElementById("charts-row");
const trancheesPanel = document.getElementById("tranchees-panel");

const MOIS_COURTS = ["Jan","Fév","Mar","Avr","Mai","Juin","Juil","Aoû","Sep","Oct","Nov","Déc"];
const COULEURS_SECTION = ["#163e2c","#13a538","#aecc53","#9db0bf","#e27954","#78675a"];

let chartMensuel = null, chartSection = null, chartTranchees = null;

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

programmeSelect.addEventListener("change", chargerDashboard);

async function chargerDashboard() {
  const id = programmeSelect.value;
  if (!id) return;

  const data = await apiGet(`/production/${id}/dashboard`);
  if (!data) return;

  placeholder.style.display = "none";
  kpiGrid.style.display = "grid";
  chartsRow.style.display = "grid";
  trancheesPanel.style.display = "block";

  afficherKPIs(data.kpis, data.tranchees_etats);
  afficherChartMensuel(data.par_mois);
  afficherChartSection(data.par_section);
  afficherChartTranchees(data.tranchees_etats);
}

function afficherKPIs(kpis, etats) {
  document.getElementById("kpi-prevu").textContent = kpis.total_prevu.toLocaleString("fr");
  document.getElementById("kpi-realise").textContent = kpis.total_realise.toLocaleString("fr");
  document.getElementById("kpi-taux").textContent = kpis.taux_accomplissement + " %";
  document.getElementById("kpi-unite").textContent = kpis.unite;
  document.getElementById("kpi-tranchees").textContent = etats.en_cours;
  document.getElementById("kpi-tranchees-detail").textContent =
    `${etats.epuise} épuisée(s) · ${etats.non_commence} non commencée(s)`;
}

function afficherChartMensuel(parMois) {
  const labels = parMois.map((m) => {
    const d = new Date(m.mois);
    return MOIS_COURTS[d.getMonth()];
  });
  const prevus = parMois.map((m) => m.prevu);
  const realises = parMois.map((m) => m.realise);

  if (chartMensuel) chartMensuel.destroy();
  chartMensuel = new Chart(document.getElementById("chart-mensuel").getContext("2d"), {
    type: "bar",
    data: {
      labels,
      datasets: [
        { label: "Prévu", data: prevus, backgroundColor: "#aecc53", borderRadius: 4 },
        { label: "Réalisé", data: realises, backgroundColor: "#13a538", borderRadius: 4 },
      ],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } },
    },
  });
}

function afficherChartSection(parSection) {
  if (chartSection) chartSection.destroy();
  chartSection = new Chart(document.getElementById("chart-section").getContext("2d"), {
    type: "doughnut",
    data: {
      labels: parSection.map((s) => s.section),
      datasets: [{
        data: parSection.map((s) => s.valeur),
        backgroundColor: COULEURS_SECTION.slice(0, parSection.length),
        borderWidth: 2,
        borderColor: "#fff",
      }],
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "bottom", labels: { font: { size: 11 } } } },
    },
  });
}

function afficherChartTranchees(etats) {
  if (chartTranchees) chartTranchees.destroy();
  chartTranchees = new Chart(document.getElementById("chart-tranchees").getContext("2d"), {
    type: "bar",
    data: {
      labels: ["Non commencées", "En cours", "Épuisées"],
      datasets: [{
        data: [etats.non_commence, etats.en_cours, etats.epuise],
        backgroundColor: ["#9db0bf", "#13a538", "#e27954"],
        borderRadius: 4,
      }],
    },
    options: {
      indexAxis: "y",
      responsive: true,
      plugins: { legend: { display: false } },
      scales: { x: { beginAtZero: true, ticks: { precision: 0 } } },
    },
  });
}

chargerProgrammes();