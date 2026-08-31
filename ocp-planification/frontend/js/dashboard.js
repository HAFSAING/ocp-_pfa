// dashboard.js — infos utilisateur + déconnexion
// Les stats sont chargées par nav.js directement

const token = sessionStorage.getItem("access_token");
const utilisateurRaw = sessionStorage.getItem("utilisateur");

if (!token || !utilisateurRaw) {
  window.location.href = "login.html";
}