const programmeSelect = document.getElementById("programme-select");
const exportBtn = document.getElementById("export-btn");
const exportImgBtn = document.getElementById("export-img-btn");
const exportPdfBtn = document.getElementById("export-pdf-btn");
const moisButtons = document.getElementById("mois-buttons");
const ganttChart = document.getElementById("gantt-chart");
const ganttLegend = document.getElementById("gantt-legend");

const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];
const TYPE_LABELS = { decapage:"Décapage", foration:"Foration", sautage:"Sautage", criblage:"Criblage", transport:"Transport", reprise:"Reprise" };
const TYPE_COLORS = { decapage:"#c68a3f", foration:"#163e2c", sautage:"#dc3545", criblage:"#e27954", transport:"#13a538", reprise:"#9db0bf" };

let tachesActuelles = [];
let moisActuel = new Date().getMonth();
let anneeActuelle = new Date().getFullYear();

function getToken() {
  const t = sessionStorage.getItem("access_token");
  if (!t) { window.location.href = "login.html"; return null; }
  return t;
}

async function chargerProgrammes() {
  const token = getToken(); if (!token) return;
  try {
    const r = await fetch(`${API_BASE_URL}/programmes/`, { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) return;
    const data = await r.json();
    if (!Array.isArray(data)) return;
    data.forEach(p => {
      const o = document.createElement("option");
      o.value = p.id;
      o.textContent = `${p.annee} — ${p.mine||""} ${p.section?"("+p.section+")":""}`;
      programmeSelect.appendChild(o);
    });
    if (data.length === 1) {
      programmeSelect.value = data[0].id;
      activerBoutons();
      chargerTaches();
    }
  } catch(e) { console.error("Erreur programmes:", e); }
}

function activerBoutons() {
  if (exportBtn) exportBtn.disabled = false;
  if (exportImgBtn) exportImgBtn.disabled = false;
  if (exportPdfBtn) exportPdfBtn.disabled = false;
}

programmeSelect.addEventListener("change", () => { activerBoutons(); chargerTaches(); });

function genererBoutonsMois() {
  if (!moisButtons) return;
  moisButtons.innerHTML = "";
  MOIS_FR.forEach((nom, i) => {
    const btn = document.createElement("button");
    btn.className = "btn-mois" + (i === moisActuel ? " active" : "");
    btn.textContent = nom;
    btn.addEventListener("click", () => {
      moisActuel = i;
      document.querySelectorAll(".btn-mois").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      if (tachesActuelles.length) dessinerGantt(tachesActuelles);
    });
    moisButtons.appendChild(btn);
  });
}

async function chargerTaches() {
  const id = programmeSelect.value; if (!id) return;
  const token = getToken(); if (!token) return;
  try {
    const r = await fetch(`${API_BASE_URL}/taches/programme/${id}`, { headers: { "Authorization": `Bearer ${token}` } });
    const taches = await r.json();
    if (!taches || taches.length === 0) {
      if (ganttLegend) ganttLegend.style.display = "none";
      ganttChart.innerHTML = `<div style="text-align:center;color:var(--text-faint);padding:60px;font-size:14px;">Aucune tâche planifiée. Ajoutez des tâches dans "Tâches & Événements".</div>`;
      return;
    }
    tachesActuelles = taches;
    if (ganttLegend) ganttLegend.style.display = "flex";
    dessinerGantt(taches);
  } catch(e) { console.error("Erreur tâches:", e); }
}

function dessinerGantt(taches) {
  const debut = new Date(anneeActuelle, moisActuel, 1);
  const fin = new Date(anneeActuelle, moisActuel + 1, 0);
  const today = new Date();
  const totalJours = fin.getDate();

  const tachesMois = taches.filter(t => {
    if (!t.date_debut_prevue && !t.date_fin_prevue) return true;
    const d = t.date_debut_prevue ? new Date(t.date_debut_prevue) : debut;
    const f = t.date_fin_prevue ? new Date(t.date_fin_prevue) : fin;
    return d <= fin && f >= debut;
  });

  const colGauche = 310;
  const lj = Math.max(Math.floor((Math.min(window.innerWidth - 300, 1100) - colGauche) / totalJours), 16);
  const hauteurLigne = 42;
  const hauteurEntete = 58;
  const largeurTotal = colGauche + totalJours * lj;
  const hauteurTotal = hauteurEntete + Math.max(tachesMois.length, 1) * hauteurLigne + 24;

  const svg = creerSVG(largeurTotal, hauteurTotal);

  svg.appendChild(R(0, 0, largeurTotal, hauteurTotal, "#fff", 0));
  svg.appendChild(R(0, 0, colGauche, hauteurEntete, "#163e2c", 0));
  svg.appendChild(T(colGauche/2, 20, `${MOIS_FR[moisActuel]} ${anneeActuelle}`, "#aecc53", "700", "middle", 13));

  const colHeaders = [{x:0,w:150,l:"Tâche / Phase"},{x:150,w:80,l:"Début"},{x:230,w:80,l:"Fin"}];
  colHeaders.forEach(c => svg.appendChild(T(c.x+c.w/2, 44, c.l, "#9db0bf", "600", "middle", 11)));
  [0,150,230].forEach(x => svg.appendChild(L(x, 0, x, hauteurTotal, "#2a5a3c", 1)));
  svg.appendChild(L(colGauche, 0, colGauche, hauteurTotal, "#2a5a3c", 2));

  svg.appendChild(R(colGauche, 0, totalJours*lj, hauteurEntete, "#163e2c", 0));
  for (let j=1; j<=totalJours; j++) {
    const x = colGauche + (j-1)*lj;
    const dateJ = new Date(anneeActuelle, moisActuel, j);
    const isDim = dateJ.getDay()===0;
    const isLun = dateJ.getDay()===1;
    if (isDim) svg.appendChild(R(x, hauteurEntete, lj, hauteurTotal-hauteurEntete, "rgba(255,255,255,0.05)", 0));
    if (isLun) {
      svg.appendChild(L(x, hauteurEntete, x, hauteurTotal, "#e9ecef", 1));
      svg.appendChild(L(x, 0, x, hauteurEntete, "rgba(255,255,255,0.12)", 1));
    }
    svg.appendChild(T(x+lj/2, 42, j, isDim?"#aecc53":"#9db0bf", isDim?"700":"400", "middle", 11));
  }

  if (tachesMois.length === 0) {
    svg.appendChild(R(0, hauteurEntete, largeurTotal, hauteurLigne, "#f8f9fa", 0));
    svg.appendChild(T(largeurTotal/2, hauteurEntete+hauteurLigne/2+5, "Aucune tâche ce mois — changez de mois ou ajoutez des tâches", "#9db0bf", "normal", "middle", 12));
  }

  tachesMois.forEach((tache, i) => {
    const y = hauteurEntete + i*hauteurLigne;
    svg.appendChild(R(0, y, largeurTotal, hauteurLigne, i%2===0?"#f8f9fa":"#fff", 0));
    svg.appendChild(L(0, y+hauteurLigne, largeurTotal, y+hauteurLigne, "#dee2e6", 1));
    [150,230,colGauche].forEach(x => svg.appendChild(L(x, y, x, y+hauteurLigne, "#dee2e6", x===colGauche?2:1)));

    const couleur = TYPE_COLORS[tache.type_tache] || "#9db0bf";
    const typLabel = TYPE_LABELS[tache.type_tache] || tache.type_tache;

    svg.appendChild(R(8, y+16, 10, 10, couleur, 3));
    svg.appendChild(T(24, y+hauteurLigne/2+5, typLabel, "#333", "600", "start", 12));

    const fmtD = d => d ? new Date(d).toLocaleDateString("fr-FR",{day:"2-digit",month:"2-digit"}) : "—";
    svg.appendChild(T(190, y+hauteurLigne/2+5, fmtD(tache.date_debut_prevue), "#495057", "normal", "middle", 11));
    svg.appendChild(T(270, y+hauteurLigne/2+5, fmtD(tache.date_fin_prevue), "#495057", "normal", "middle", 11));

    if (tache.date_debut_prevue && tache.date_fin_prevue) {
      const dD = new Date(tache.date_debut_prevue);
      const dF = new Date(tache.date_fin_prevue);
      const dC = dD < debut ? debut : dD;
      const fC = dF > fin ? fin : dF;
      if (dC <= fC) {
        const xB = colGauche + (dC.getDate()-1)*lj;
        const wB = Math.max((fC.getDate()-dC.getDate()+1)*lj, lj);
        const yB = y+9; const hB = hauteurLigne-18;
        const barC = tache.statut==="perturbe"?"#ff6b35": tache.statut==="termine"?"#aecc53":couleur;
        svg.appendChild(R(xB+2, yB+2, wB, hB, "rgba(0,0,0,0.09)", 5));
        svg.appendChild(R(xB, yB, wB, hB, barC, 5));

        // Barre d'avancement
        const pct = tache.avancement_pct || 0;
        if (pct > 0 && pct < 100) {
          svg.appendChild(R(xB, yB, wB*(pct/100), hB, "rgba(0,0,0,0.18)", 5));
        }

        if (tache.impact_total_jours > 0) {
          const wI = Math.min(tache.impact_total_jours*lj, wB);
          svg.appendChild(R(xB+wB-wI, yB, wI, hB, "rgba(220,53,69,0.3)", 0));
        }
        if (wB > 50) svg.appendChild(T(xB+wB/2, yB+hB/2+4, typLabel, "#fff", "600", "middle", 10));
      }
    }
  });

  if (today.getMonth()===moisActuel && today.getFullYear()===anneeActuelle) {
    const xT = colGauche + (today.getDate()-1)*lj + lj/2;
    svg.appendChild(L(xT, 0, xT, hauteurTotal, "#dc3545", 2));
    svg.appendChild(T(xT+3, 12, "Aujourd'hui", "#dc3545", "700", "start", 10));
  }

  const wrap = document.createElement("div");
  wrap.style.cssText = "overflow-x:auto;overflow-y:auto;max-height:560px;";
  wrap.appendChild(svg);
  ganttChart.innerHTML = "";
  ganttChart.appendChild(wrap);
}

function creerSVG(w,h){ const s=document.createElementNS("http://www.w3.org/2000/svg","svg"); s.setAttribute("width",w);s.setAttribute("height",h);s.setAttribute("xmlns","http://www.w3.org/2000/svg");return s; }
function R(x,y,w,h,fill,r=0){ const e=document.createElementNS("http://www.w3.org/2000/svg","rect"); e.setAttribute("x",x);e.setAttribute("y",y);e.setAttribute("width",Math.max(w,0));e.setAttribute("height",Math.max(h,0));e.setAttribute("fill",fill);e.setAttribute("rx",r);return e; }
function L(x1,y1,x2,y2,s,w=1){ const e=document.createElementNS("http://www.w3.org/2000/svg","line"); e.setAttribute("x1",x1);e.setAttribute("y1",y1);e.setAttribute("x2",x2);e.setAttribute("y2",y2);e.setAttribute("stroke",s);e.setAttribute("stroke-width",w);return e; }
function T(x,y,text,fill,weight="normal",anchor="middle",size=12){ const e=document.createElementNS("http://www.w3.org/2000/svg","text"); e.setAttribute("x",x);e.setAttribute("y",y);e.setAttribute("fill",fill);e.setAttribute("font-weight",weight);e.setAttribute("text-anchor",anchor);e.setAttribute("font-size",size);e.setAttribute("font-family","Inter,sans-serif");e.textContent=text;return e; }

// Export Excel
exportBtn?.addEventListener("click", async () => {
  const id = programmeSelect.value; if (!id) return;
  exportBtn.disabled = true; exportBtn.textContent = "Export...";
  const token = getToken();
  try {
    const r = await fetch(`${API_BASE_URL}/gantt/${id}/export-excel`, { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) throw new Error();
    const blob = await r.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `gantt_${id}.xlsx`; document.body.appendChild(a); a.click(); a.remove();
  } catch(e) { alert("Export Excel impossible."); }
  finally { exportBtn.disabled=false; exportBtn.textContent="Exporter Excel"; }
});

// Export image
exportImgBtn?.addEventListener("click", async () => {
  const el = document.getElementById("gantt-chart"); if (!el) return;
  exportImgBtn.disabled = true; exportImgBtn.textContent = "Génération...";
  try {
    if (typeof htmlToImage === "undefined") { alert("Rechargez la page et réessayez."); return; }
    const url = await htmlToImage.toPng(el, { backgroundColor:"#ffffff", pixelRatio:2 });
    const a = document.createElement("a"); a.href = url;
    a.download = `Gantt_${MOIS_FR[moisActuel]}_${anneeActuelle}.png`;
    document.body.appendChild(a); a.click(); a.remove();
  } catch(e) { console.error(e); alert("Export image impossible."); }
  finally {
    exportImgBtn.disabled = false;
    exportImgBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg> Télécharger l'image`;
  }
});

// Export PDF
exportPdfBtn?.addEventListener("click", async () => {
  const id = programmeSelect.value; if (!id) return;
  exportPdfBtn.disabled = true; exportPdfBtn.textContent = "Génération PDF...";
  const token = getToken();
  try {
    const url = `${API_BASE_URL}/taches/rapport-pdf/${id}?annee=${anneeActuelle}&mois=${moisActuel+1}`;
    const r = await fetch(url, { headers: { "Authorization": `Bearer ${token}` } });
    if (!r.ok) throw new Error();
    const blob = await r.blob();
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob);
    a.download = `Rapport_${MOIS_FR[moisActuel]}_${anneeActuelle}.pdf`;
    document.body.appendChild(a); a.click(); a.remove();
  } catch(e) { alert("Génération PDF impossible. Vérifiez que reportlab est installé."); }
  finally {
    exportPdfBtn.disabled = false;
    exportPdfBtn.innerHTML = `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg> Rapport PDF`;
  }
});

document.addEventListener("DOMContentLoaded", () => { genererBoutonsMois(); });
setTimeout(() => { chargerProgrammes(); }, 300);