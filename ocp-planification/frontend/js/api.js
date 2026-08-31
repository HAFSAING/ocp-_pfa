const API_BASE_URL = "http://127.0.0.1:8000";

// Récupère le token, redirige vers login si absent
function getToken() {
  const token = sessionStorage.getItem("access_token");
  if (!token) {
    window.location.href = "login.html";
    return null;
  }
  return token;
}

function getUtilisateur() {
  const raw = sessionStorage.getItem("utilisateur");
  return raw ? JSON.parse(raw) : null;
}

// Appel API générique avec authentification
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  if (!token) return null;

  const headers = {
    "Content-Type": "application/json",
    "Authorization": `Bearer ${token}`,
    ...(options.headers || {}),
  };

  const response = await fetch(`${API_BASE_URL}${endpoint}`, { ...options, headers });

  if (response.status === 401) {
    sessionStorage.clear();
    window.location.href = "login.html";
    return null;
  }

  return response;
}

// Raccourcis
async function apiGet(endpoint) {
  const res = await apiFetch(endpoint);
  if (!res) return null;
  return res.ok ? res.json() : null;
}

async function apiPost(endpoint, body) {
  const res = await apiFetch(endpoint, { method: "POST", body: JSON.stringify(body) });
  return res;
}

async function apiDelete(endpoint) {
  return apiFetch(endpoint, { method: "DELETE" });
}