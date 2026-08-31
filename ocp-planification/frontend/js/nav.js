// ============================================
// Navigation commune — sidebar générée + topbar + rôles + logout + stats
// ============================================

(function () {
  const utilisateur_raw = sessionStorage.getItem("utilisateur");
  const token = sessionStorage.getItem("access_token");

  if (!utilisateur_raw || !token) {
    window.location.href = "login.html";
    return;
  }

  const utilisateur = JSON.parse(utilisateur_raw);
  const BASE = "http://127.0.0.1:8000";
  const ROLE_LABELS = { admin: "Planificateur", contributeur: "Contributeur", viewer: "Consultation" };
  const MOIS_FR = ["Janvier","Février","Mars","Avril","Mai","Juin","Juillet","Août","Septembre","Octobre","Novembre","Décembre"];

  const MENU = [
    { section: "Vue d'ensemble" },
    { href: "dashboard.html", label: "Tableau de bord", icon: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>' },
    { href: "gantt.html", label: "Planning Gantt", icon: '<line x1="4" y1="7" x2="14" y2="7"/><line x1="8" y1="12" x2="20" y2="12"/><line x1="6" y1="17" x2="16" y2="17"/>' },
    { section: "Données", roles: "admin,contributeur" },
    { href: "programme.html", label: "Programme annuel", icon: '<path d="M4 4h16v16H4z"/><line x1="4" y1="9" x2="20" y2="9"/>', roles: "admin" },
    { href: "production.html", label: "Production mensuelle", icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>', roles: "admin,contributeur" },
    { href: "panneaux.html", label: "Panneaux", icon: '<rect x="3" y="4" width="18" height="16" rx="2"/><line x1="3" y1="10" x2="21" y2="10"/>', roles: "admin" },
    { href: "saisie-mensuelle.html", label: "Saisie mensuelle", icon: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4z"/>', roles: "admin,contributeur" },
    { href: "taches.html", label: "Tâches & Événements", icon: '<path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>', roles: "admin,contributeur" },
    { section: "Suivi" },
    { href: "suivi-powerbi.html", label: "Suivi ", icon: '<line x1="18" y1="20" x2="18" y2="10"/><line x1="12" y1="20" x2="12" y2="4"/><line x1="6" y1="20" x2="6" y2="14"/>' },
  ];

  const pageCourante = window.location.pathname.split("/").pop();

  // Sidebar
  const sidebar = document.querySelector(".sidebar");
  if (sidebar) {
    let html = "";
    MENU.forEach(item => {
      if (item.section) {
        const ra = item.roles ? ` data-roles="${item.roles}"` : "";
        html += `<div class="sidebar-section-label"${ra}>${item.section}</div>`;
      } else {
        const actif = item.href === pageCourante ? " active" : "";
        const ra = item.roles ? ` data-roles="${item.roles}"` : "";
        html += `<a href="${item.href}" class="sidebar-nav-item${actif}"${ra}><svg viewBox="0 0 24 24">${item.icon}</svg>${item.label}</a>`;
      }
    });
    sidebar.innerHTML = html;
  }

  // Topbar infos utilisateur
  function initiales(nom) {
    return nom.split(" ").filter(Boolean).slice(0,2).map(m=>m[0].toUpperCase()).join("");
  }
  const elInit = document.getElementById("user-initials");
  const elName = document.getElementById("user-name");
  const elRole = document.getElementById("user-role");
  const elWelcome = document.getElementById("welcome-title");
  const elMois = document.getElementById("ctx-mois");

  if (elInit) elInit.textContent = initiales(utilisateur.nom_complet);
  if (elName) elName.textContent = utilisateur.nom_complet;
  if (elRole) elRole.textContent = ROLE_LABELS[utilisateur.role] || utilisateur.role;
  if (elWelcome) elWelcome.textContent = `Bonjour, ${utilisateur.nom_complet.split(" ")[0]}`;
  if (elMois) {
    const now = new Date();
    elMois.textContent = `${MOIS_FR[now.getMonth()]} ${now.getFullYear()}`;
  }

  // Filtrage rôles
  document.querySelectorAll("[data-roles]").forEach(el => {
    if (!el.dataset.roles.split(",").includes(utilisateur.role)) {
      el.classList.add("role-hidden");
    }
  });

  // Déconnexion
  const logoutBtn = document.getElementById("logout-btn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      sessionStorage.clear();
      window.location.href = "login.html";
    });
  }

  // Stats dashboard
  if (pageCourante === "dashboard.html") {
    chargerStatsDashboard();
  }

  async function chargerStatsDashboard() {
    const h = { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" };
    try {
      const progs = await fetch(`${BASE}/programmes/`, { headers: h }).then(r => r.json());
      if (!Array.isArray(progs) || progs.length === 0) return;

      const elProg = document.getElementById("stat-programmes");
      if (elProg) { elProg.textContent = progs.length; elProg.classList.remove("is-empty"); }

      const prog = progs[progs.length - 1];
      const ctxProg = document.getElementById("ctx-programme");
      if (ctxProg) ctxProg.textContent = `${prog.mine || ""} ${prog.section ? "("+prog.section+")" : ""} ${prog.annee}`;

      const pans = await fetch(`${BASE}/panneaux/?programme_id=${prog.id}`, { headers: h }).then(r => r.json());
      if (Array.isArray(pans)) {
        const elPan = document.getElementById("stat-panneaux");
        if (elPan) { elPan.textContent = pans.length; elPan.classList.remove("is-empty"); }
      }

      const taches = await fetch(`${BASE}/taches/programme/${prog.id}`, { headers: h }).then(r => r.json());
      if (Array.isArray(taches)) {
        const retards = taches.filter(t => t.statut === "perturbe").length;
        const elRet = document.getElementById("stat-retards");
        if (elRet && retards > 0) { elRet.textContent = retards; elRet.classList.remove("is-empty"); }
      }

      const saisies = await fetch(`${BASE}/saisies/`, { headers: h }).then(r => r.json());
      if (Array.isArray(saisies)) {
        const m = new Date().getMonth(), a = new Date().getFullYear();
        const nb = saisies.filter(s => {
          const d = new Date(s.mois);
          return d.getMonth() === m && d.getFullYear() === a;
        }).length;
        const elSai = document.getElementById("stat-saisies");
        if (elSai && nb > 0) { elSai.textContent = nb; elSai.classList.remove("is-empty"); }
      }
    } catch(e) { console.error("Erreur stats dashboard:", e); }
  }

})();