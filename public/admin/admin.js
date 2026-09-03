const siteConfig = window.SITE_CONFIG || {};
const loginView = document.querySelector("#login-view");
const passwordView = document.querySelector("#password-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const passwordForm = document.querySelector("#password-form");
const photoForm = document.querySelector("#photo-form");
const serviceForm = document.querySelector("#service-form");
const userForm = document.querySelector("#user-form");
const themeForm = document.querySelector("#theme-form");
const themePanel = document.querySelector("#theme-panel");
const primaryColor = document.querySelector("#primary-color");
const primaryColorText = document.querySelector("#primary-color-text");
const secondaryColor = document.querySelector("#secondary-color");
const secondaryColorText = document.querySelector("#secondary-color-text");
const themeStatus = document.querySelector("#theme-status");
const resetThemeButton = document.querySelector("#reset-theme-button");
const logoutButton = document.querySelector("#logout-button");
const loginStatus = document.querySelector("#login-status");
const passwordStatus = document.querySelector("#password-status");
const photoStatus = document.querySelector("#photo-status");
const formStatus = document.querySelector("#form-status");
const userStatus = document.querySelector("#user-status");
const servicesList = document.querySelector("#services-list");
const servicesCount = document.querySelector("#services-count");
const usersPanel = document.querySelector("#users-panel");
const usersList = document.querySelector("#users-list");
const usersCount = document.querySelector("#users-count");
const sessionRole = document.querySelector("#session-role");
const serviceId = document.querySelector("#service-id");
const serviceTitle = document.querySelector("#service-title");
const serviceDescription = document.querySelector("#service-description");
const servicePoints = document.querySelector("#service-points");
const serviceActive = document.querySelector("#service-active");
const saveButton = document.querySelector("#save-button");
const formTitle = document.querySelector("#form-title");
const cancelEdit = document.querySelector("#cancel-edit");
const photoInput = document.querySelector("#photo-input");
const photoPreview = document.querySelector("#photo-preview");
const photoPlaceholder = document.querySelector("#photo-placeholder");
const userName = document.querySelector("#user-name");
const userEmail = document.querySelector("#user-email");
const userRole = document.querySelector("#user-role");
const userPassword = document.querySelector("#user-password");
const createUserButton = document.querySelector("#create-user-button");

let services = [];
let users = [];
let currentUser = null;
let currentTheme = {
  ...(window.RETORNA_THEME?.DEFAULT_THEME || {
    primaryColor: "#132238",
    secondaryColor: "#A77943"
  })
};

const escapeHtml = (value = "") =>
  String(value).replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const setStatus = (element, message = "", type = "") => {
  element.textContent = message;
  element.className = "status" + (type ? " " + type : "");
};

const api = async (url, options = {}) => {
  const headers = { Accept: "application/json", ...(options.headers || {}) };
  if (!(options.body instanceof FormData)) headers["Content-Type"] = "application/json";

  const response = await fetch(url, {
    credentials: "same-origin",
    ...options,
    headers
  });

  const body = await response.json().catch(() => ({}));

  if (!response.ok) {
    const error = new Error(body.message || "Não foi possível concluir a operação.");
    error.status = response.status;
    throw error;
  }

  return body;
};

const applyBrand = () => {
  const brand = siteConfig.brand || {};

  document.querySelectorAll("[data-site-name]").forEach((element) => {
    element.textContent = brand.name || element.textContent;
  });

  document.querySelectorAll("[data-site-initials]").forEach((element) => {
    element.textContent = brand.initials || element.textContent;
  });
};

const showView = (view) => {
  [loginView, passwordView, dashboardView].forEach((item) => item.classList.add("hidden"));
  view.classList.remove("hidden");
};

const roleLabel = (role) => {
  if (role === "master") return "Master Retorna";
  return role === "owner" ? "Proprietário" : "Editor";
};

const applyTheme = (theme) => {
  currentTheme = window.RETORNA_THEME?.applyTheme(theme) || currentTheme;
  return currentTheme;
};

const setThemeForm = (theme) => {
  const applied = applyTheme(
    theme || window.RETORNA_THEME?.DEFAULT_THEME || currentTheme
  );
  primaryColor.value = applied.primaryColor;
  primaryColorText.value = applied.primaryColor;
  secondaryColor.value = applied.secondaryColor;
  secondaryColorText.value = applied.secondaryColor;
};

const previewTheme = () => {
  const normalize = window.RETORNA_THEME?.normalizeHex;
  if (!normalize) return;

  const primary = normalize(primaryColorText.value, "");
  const secondary = normalize(secondaryColorText.value, "");

  if (!/^#[0-9A-F]{6}$/.test(primary) || !/^#[0-9A-F]{6}$/.test(secondary)) {
    return;
  }

  primaryColor.value = primary;
  secondaryColor.value = secondary;
  applyTheme({ primaryColor: primary, secondaryColor: secondary });
};

const createId = (title) => {
  const slug = title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 70);

  let candidate = slug || "servico";
  let index = 2;

  while (services.some((item) => item.id === candidate)) {
    candidate = slug + "-" + index;
    index += 1;
  }

  return candidate;
};

const renderServices = () => {
  servicesCount.textContent = String(services.length);

  if (!services.length) {
    servicesList.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado.</div>';
    return;
  }

  servicesList.innerHTML = services.map((service) => {
    const isActive = service.active !== false;

    return (
      '<article class="service-item' + (isActive ? "" : " inactive") + '">' +
        '<div class="service-item-heading">' +
          "<div>" +
            "<h3>" + escapeHtml(service.title) + "</h3>" +
            "<p>" + escapeHtml(service.description) + "</p>" +
          "</div>" +
          '<span class="badge' + (isActive ? "" : " inactive") + '">' +
            (isActive ? "Ativo" : "Oculto") +
          "</span>" +
        "</div>" +
        '<div class="service-actions">' +
          '<button type="button" data-action="edit" data-id="' + escapeHtml(service.id) + '">Editar</button>' +
          '<button class="delete" type="button" data-action="delete" data-id="' + escapeHtml(service.id) + '">Excluir</button>' +
        "</div>" +
      "</article>"
    );
  }).join("");
};

const renderUsers = () => {
  usersCount.textContent = String(users.length);

  if (!users.length) {
    usersList.innerHTML = '<div class="empty-state">Nenhum usuário cadastrado.</div>';
    return;
  }

  usersList.innerHTML = users.map((user) => {
    const isSelf = currentUser && user.id === currentUser.id;
    const isActive = user.active !== false;
    const displayName = user.name || "Sem nome";

    return (
      '<article class="user-item' + (isActive ? "" : " inactive") + '" data-user-id="' + escapeHtml(user.id) + '">' +
        '<div class="user-item-heading">' +
          '<div class="user-identity">' +
            "<strong>" + escapeHtml(displayName) + (isSelf ? " (você)" : "") + "</strong>" +
            "<span>" + escapeHtml(user.email) + "</span>" +
          "</div>" +
          '<div class="user-badges">' +
            '<span class="badge">' + roleLabel(user.role) + "</span>" +
            '<span class="badge' + (isActive ? "" : " inactive") + '">' + (isActive ? "Ativo" : "Inativo") + "</span>" +
            (user.mustChangePassword ? '<span class="badge inactive">Senha temporária</span>' : "") +
          "</div>" +
        "</div>" +
        '<div class="user-edit-grid">' +
          '<input data-user-name type="text" maxlength="100" value="' + escapeHtml(user.name || "") + '" placeholder="Nome">' +
          '<select data-user-role' + (isSelf ? " disabled" : "") + ">" +
            '<option value="editor"' + (user.role === "editor" ? " selected" : "") + ">Editor</option>" +
            '<option value="owner"' + (user.role === "owner" ? " selected" : "") + ">Proprietário</option>" +
          "</select>" +
        "</div>" +
        '<div class="user-actions">' +
          '<button type="button" data-user-action="save" data-id="' + escapeHtml(user.id) + '">Salvar acesso</button>' +
          (!isSelf
            ? '<button type="button" data-user-action="toggle" data-id="' + escapeHtml(user.id) + '">' + (isActive ? "Desativar" : "Ativar") + "</button>"
            : "") +
          (!isSelf
            ? '<button type="button" data-user-action="reset" data-id="' + escapeHtml(user.id) + '">Redefinir senha</button>'
            : "") +
          (!isSelf
            ? '<button class="danger" type="button" data-user-action="delete" data-id="' + escapeHtml(user.id) + '">Excluir</button>'
            : "") +
        "</div>" +
      "</article>"
    );
  }).join("");
};

const resetServiceForm = () => {
  serviceForm.reset();
  serviceId.value = "";
  serviceActive.checked = true;
  formTitle.textContent = "Novo serviço";
  saveButton.textContent = "Cadastrar serviço";
  cancelEdit.classList.add("hidden");
  setStatus(formStatus);
};

const saveServices = async () => {
  await api("/api/admin/services", {
    method: "PUT",
    body: JSON.stringify({ services })
  });
};

const loadPhoto = (photoUrl) => {
  if (!photoUrl) return;
  photoPreview.src = photoUrl;
  photoPreview.hidden = false;
  photoPlaceholder.hidden = true;
};

const loadUsers = async () => {
  if (!currentUser || !["master", "owner"].includes(currentUser.role)) {
    usersPanel.classList.add("hidden");
    users = [];
    return;
  }

  const result = await api("/api/admin/users");
  users = Array.isArray(result.users) ? result.users : [];

  const hasOwner = users.some((user) =>
    user.role === "owner" && user.active !== false
  );

  if (currentUser.role === "master" && !hasOwner) {
    userRole.value = "owner";
  }

  usersPanel.classList.remove("hidden");
  renderUsers();
};

const loadDashboard = async () => {
  const session = await api("/api/auth/session");
  currentUser = session.user || null;

  if (!currentUser) {
    showView(loginView);
    return;
  }

  sessionRole.textContent = roleLabel(currentUser.role);
  showView(dashboardView);

  const [serviceResult, contentResult] = await Promise.all([
    api("/api/admin/services"),
    fetch("/api/content", { headers: { Accept: "application/json" } })
      .then((response) => response.ok ? response.json() : {})
      .catch(() => ({}))
  ]);

  if (Array.isArray(serviceResult.services)) {
    services = serviceResult.services;
  } else {
    const response = await fetch("../data/services.json?v=" + Date.now());
    services = response.ok ? await response.json() : [];
    if (!Array.isArray(services)) services = [];
  }

  renderServices();
  loadPhoto(contentResult.photoUrl);
  applyTheme(contentResult.theme || window.RETORNA_THEME?.DEFAULT_THEME);

  if (["master", "owner"].includes(currentUser.role)) {
    setThemeForm(contentResult.theme || window.RETORNA_THEME?.DEFAULT_THEME);
    themePanel.classList.remove("hidden");
    await loadUsers();
  } else {
    themePanel.classList.add("hidden");
    usersPanel.classList.add("hidden");
  }
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = loginForm.querySelector("button[type='submit']");
  button.disabled = true;
  setStatus(loginStatus, "Validando acesso...");

  try {
    const result = await api("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({
        email: document.querySelector("#email").value.trim(),
        password: document.querySelector("#password").value
      })
    });

    currentUser = result.user || null;
    document.querySelector("#password").value = "";
    setStatus(loginStatus);

    if (result.mustChangePassword) {
      showView(passwordView);
      document.querySelector("#current-password").focus();
    } else {
      await loadDashboard();
    }
  } catch (error) {
    setStatus(loginStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

passwordForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = passwordForm.querySelector("button[type='submit']");
  const currentPassword = document.querySelector("#current-password").value;
  const newPassword = document.querySelector("#new-password").value;
  const confirmPassword = document.querySelector("#confirm-password").value;

  if (newPassword !== confirmPassword) {
    setStatus(passwordStatus, "As novas senhas não coincidem.", "error");
    return;
  }

  button.disabled = true;
  setStatus(passwordStatus, "Salvando nova senha...");

  try {
    const result = await api("/api/auth/change-password", {
      method: "POST",
      body: JSON.stringify({ currentPassword, newPassword })
    });

    currentUser = result.user || currentUser;
    passwordForm.reset();
    setStatus(passwordStatus);
    await loadDashboard();
  } catch (error) {
    setStatus(passwordStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

logoutButton.addEventListener("click", async () => {
  try {
    await api("/api/auth/logout", { method: "POST", body: "{}" });
  } finally {
    services = [];
    users = [];
    currentUser = null;
    usersPanel.classList.add("hidden");
    showView(loginView);
    loginForm.reset();
  }
});

primaryColor.addEventListener("input", () => {
  primaryColorText.value = primaryColor.value.toUpperCase();
  previewTheme();
});

secondaryColor.addEventListener("input", () => {
  secondaryColorText.value = secondaryColor.value.toUpperCase();
  previewTheme();
});

primaryColorText.addEventListener("input", previewTheme);
secondaryColorText.addEventListener("input", previewTheme);

themeForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const normalize = window.RETORNA_THEME?.normalizeHex;
  const primary = normalize?.(primaryColorText.value, "");
  const secondary = normalize?.(secondaryColorText.value, "");

  if (!/^#[0-9A-F]{6}$/.test(primary || "") || !/^#[0-9A-F]{6}$/.test(secondary || "")) {
    setStatus(themeStatus, "Informe cores válidas no formato #RRGGBB.", "error");
    return;
  }

  const button = themeForm.querySelector('button[type="submit"]');
  button.disabled = true;
  setStatus(themeStatus, "Salvando cores...");

  try {
    const result = await api("/api/admin/theme", {
      method: "PUT",
      body: JSON.stringify({
        primaryColor: primary,
        secondaryColor: secondary
      })
    });

    setThemeForm(result.theme);
    setStatus(themeStatus, "Cores atualizadas e publicadas.", "success");
  } catch (error) {
    setStatus(themeStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

resetThemeButton.addEventListener("click", () => {
  setThemeForm(window.RETORNA_THEME?.DEFAULT_THEME);
  setStatus(
    themeStatus,
    "Cores padrão carregadas na prévia. Clique em Salvar cores para publicar."
  );
});

photoInput.addEventListener("change", () => {
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  photoPreview.src = URL.createObjectURL(file);
  photoPreview.hidden = false;
  photoPlaceholder.hidden = true;
});

photoForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = photoForm.querySelector("button[type='submit']");
  const file = photoInput.files && photoInput.files[0];
  if (!file) return;

  button.disabled = true;
  setStatus(photoStatus, "Enviando foto...");

  try {
    const formData = new FormData();
    formData.append("photo", file);
    const result = await api("/api/admin/photo", {
      method: "POST",
      body: formData
    });

    loadPhoto(result.photoUrl);
    photoInput.value = "";
    setStatus(photoStatus, "Foto atualizada com sucesso.", "success");
  } catch (error) {
    setStatus(photoStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

serviceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const editingId = serviceId.value;
  const title = serviceTitle.value.trim();
  const description = serviceDescription.value.trim();
  const points = servicePoints.value
    .split("\n")
    .map((item) => item.trim())
    .filter(Boolean);

  if (!title || !description) return;

  saveButton.disabled = true;
  setStatus(formStatus, editingId ? "Salvando alterações..." : "Cadastrando serviço...");

  try {
    if (editingId) {
      const index = services.findIndex((item) => item.id === editingId);
      if (index < 0) throw new Error("Serviço não encontrado.");

      services[index] = {
        ...services[index],
        title,
        description,
        points,
        active: serviceActive.checked
      };
    } else {
      services.push({
        id: createId(title),
        title,
        description,
        points,
        active: serviceActive.checked
      });
    }

    await saveServices();
    renderServices();
    resetServiceForm();
    setStatus(formStatus, "Serviço salvo e publicado.", "success");
  } catch (error) {
    setStatus(formStatus, error.message, "error");
  } finally {
    saveButton.disabled = false;
  }
});

servicesList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-action]");
  if (!button) return;

  const item = services.find((service) => service.id === button.dataset.id);
  if (!item) return;

  if (button.dataset.action === "edit") {
    serviceId.value = item.id;
    serviceTitle.value = item.title;
    serviceDescription.value = item.description;
    servicePoints.value = Array.isArray(item.points) ? item.points.join("\n") : "";
    serviceActive.checked = item.active !== false;
    formTitle.textContent = "Editar serviço";
    saveButton.textContent = "Salvar alterações";
    cancelEdit.classList.remove("hidden");
    setStatus(formStatus);
    window.scrollTo({
      top: document.querySelector(".content-grid").offsetTop - 100,
      behavior: "smooth"
    });
    return;
  }

  if (button.dataset.action === "delete") {
    if (!window.confirm('Excluir o serviço "' + item.title + '"?')) return;

    button.disabled = true;
    const previous = services;
    services = services.filter((service) => service.id !== item.id);

    try {
      await saveServices();
      renderServices();
      if (serviceId.value === item.id) resetServiceForm();
      setStatus(formStatus, "Serviço excluído com sucesso.", "success");
    } catch (error) {
      services = previous;
      renderServices();
      setStatus(formStatus, error.message, "error");
    }
  }
});

userForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  createUserButton.disabled = true;
  setStatus(userStatus, "Cadastrando usuário...");

  try {
    await api("/api/admin/users", {
      method: "POST",
      body: JSON.stringify({
        name: userName.value.trim(),
        email: userEmail.value.trim(),
        role: userRole.value,
        temporaryPassword: userPassword.value
      })
    });

    userForm.reset();
    userRole.value = "editor";
    setStatus(userStatus, "Usuário cadastrado. Envie a senha temporária por um canal seguro.", "success");
    await loadUsers();
  } catch (error) {
    setStatus(userStatus, error.message, "error");
  } finally {
    createUserButton.disabled = false;
  }
});

usersList.addEventListener("click", async (event) => {
  const button = event.target.closest("button[data-user-action]");
  if (!button) return;

  const id = button.dataset.id;
  const user = users.find((item) => item.id === id);
  const card = button.closest(".user-item");
  if (!user || !card) return;

  button.disabled = true;
  setStatus(userStatus);

  try {
    if (button.dataset.userAction === "save") {
      const name = card.querySelector("[data-user-name]").value.trim();
      const role = card.querySelector("[data-user-role]").value;

      await api("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          name,
          role,
          active: user.active !== false
        })
      });

      setStatus(userStatus, "Acesso atualizado.", "success");
    }

    if (button.dataset.userAction === "toggle") {
      await api("/api/admin/users", {
        method: "PATCH",
        body: JSON.stringify({
          id,
          name: user.name || "",
          role: user.role,
          active: user.active === false
        })
      });

      setStatus(userStatus, user.active === false ? "Usuário ativado." : "Usuário desativado.", "success");
    }

    if (button.dataset.userAction === "reset") {
      const temporaryPassword = window.prompt(
        "Digite uma nova senha temporária. Ela deve ter pelo menos 12 caracteres, letras, número e caractere especial."
      );

      if (!temporaryPassword) {
        button.disabled = false;
        return;
      }

      await api("/api/admin/users", {
        method: "POST",
        body: JSON.stringify({
          action: "reset-password",
          id,
          temporaryPassword
        })
      });

      setStatus(userStatus, "Senha temporária redefinida. As sessões desse usuário foram encerradas.", "success");
    }

    if (button.dataset.userAction === "delete") {
      if (!window.confirm('Excluir o usuário "' + (user.name || user.email) + '"?')) {
        button.disabled = false;
        return;
      }

      await api("/api/admin/users", {
        method: "DELETE",
        body: JSON.stringify({ id })
      });

      setStatus(userStatus, "Usuário excluído.", "success");
    }

    await loadUsers();
  } catch (error) {
    setStatus(userStatus, error.message, "error");
  } finally {
    button.disabled = false;
  }
});

cancelEdit.addEventListener("click", resetServiceForm);

const restoreSession = async () => {
  applyBrand();

  try {
    const session = await api("/api/auth/session");

    if (!session.authenticated) {
      showView(loginView);
      return;
    }

    currentUser = session.user || null;

    if (session.mustChangePassword) {
      showView(passwordView);
      return;
    }

    await loadDashboard();
  } catch {
    showView(loginView);
  }
};

restoreSession();
