const API_BASE_URL = "http://127.0.0.1:8000";

// ============================================
// Utilitaires
// ============================================

function showFieldError(fieldId, message) {
  const errorEl = document.getElementById(fieldId + "-error");
  if (errorEl) {
    errorEl.textContent = message;
    errorEl.hidden = false;
  }
}

function clearFieldErrors(form) {
  form.querySelectorAll(".field-error").forEach((el) => {
    el.textContent = "";
    el.hidden = true;
  });
}

function setButtonLoading(button, isLoading, loadingText, defaultText) {
  button.disabled = isLoading;
  button.textContent = isLoading ? loadingText : defaultText;
}

// ============================================
// Login
// ============================================

const loginForm = document.getElementById("login-form");

if (loginForm) {
  loginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(loginForm);

    const email = document.getElementById("email").value.trim();
    const password = document.getElementById("password").value;
    const submitBtn = document.getElementById("submit-btn");

    if (!email || !password) {
      showFieldError("form", "Merci de remplir tous les champs.");
      return;
    }

    setButtonLoading(submitBtn, true, "Connexion...", "Se connecter");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        showFieldError("form", data.detail || "Connexion impossible.");
        setButtonLoading(submitBtn, false, "Connexion...", "Se connecter");
        return;
      }

      sessionStorage.setItem("access_token", data.access_token);
      sessionStorage.setItem("utilisateur", JSON.stringify(data.utilisateur));

      window.location.href = "dashboard.html";
    } catch (err) {
      showFieldError("form", "Impossible de contacter le serveur. Vérifie que l'API est lancée.");
      setButtonLoading(submitBtn, false, "Connexion...", "Se connecter");
    }
  });

  // Message succès après inscription
  const params = new URLSearchParams(window.location.search);
  if (params.get("compte_cree") === "1") {
    const note = document.querySelector(".login-signup-note");
    if (note) {
      const successMsg = document.createElement("p");
      successMsg.textContent = "Compte créé avec succès. Connecte-toi.";
      successMsg.style.color = "var(--accent-primary)";
      successMsg.style.fontSize = "13px";
      successMsg.style.marginBottom = "16px";
      note.parentNode.insertBefore(successMsg, note);
    }
  }
}

// ============================================
// Register
// ============================================

const registerForm = document.getElementById("register-form");

if (registerForm) {
  registerForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    clearFieldErrors(registerForm);

    const fullname = document.getElementById("fullname").value.trim();
    const email = document.getElementById("email").value.trim();
    const role = document.getElementById("role").value;
    const password = document.getElementById("password").value;
    const passwordConfirm = document.getElementById("password-confirm").value;
    const submitBtn = document.getElementById("submit-btn");

    if (!fullname || !email || !role || !password || !passwordConfirm) {
      showFieldError("form", "Merci de remplir tous les champs.");
      return;
    }

    if (password !== passwordConfirm) {
      showFieldError("password-confirm", "Les mots de passe ne correspondent pas.");
      return;
    }

    if (password.length < 6) {
      showFieldError("password", "6 caractères minimum.");
      return;
    }

    setButtonLoading(submitBtn, true, "Création...", "Créer mon compte");

    try {
      const response = await fetch(`${API_BASE_URL}/auth/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nom_complet: fullname, email, password, role }),
      });

      const data = await response.json();

      if (!response.ok) {
        showFieldError("form", data.detail || "Impossible de créer le compte.");
        setButtonLoading(submitBtn, false, "Création...", "Créer mon compte");
        return;
      }

      window.location.href = "login.html?compte_cree=1";
    } catch (err) {
      showFieldError("form", "Impossible de contacter le serveur. Vérifie que l'API est lancée.");
      setButtonLoading(submitBtn, false, "Création...", "Créer mon compte");
    }
  });
}