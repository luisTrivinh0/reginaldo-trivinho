const REPOSITORY = "luisTrivinh0/reginaldo-trivinho";
const BRANCH = "main";
const SERVICES_PATH = "data/services.json";
const API_BASE = "https://api.github.com";

const loginView = document.querySelector("#login-view");
const dashboardView = document.querySelector("#dashboard-view");
const loginForm = document.querySelector("#login-form");
const accessInput = document.querySelector("#token");
const loginStatus = document.querySelector("#login-status");
const logoutButton = document.querySelector("#logout-button");
const serviceForm = document.querySelector("#service-form");
const serviceId = document.querySelector("#service-id");
const serviceTitle = document.querySelector("#service-title");
const serviceDescription = document.querySelector("#service-description");
const servicePoints = document.querySelector("#service-points");
const serviceActive = document.querySelector("#service-active");
const saveButton = document.querySelector("#save-button");
const formStatus = document.querySelector("#form-status");
const formTitle = document.querySelector("#form-title");
const cancelEdit = document.querySelector("#cancel-edit");
const servicesList = document.querySelector("#services-list");
const servicesCount = document.querySelector("#services-count");

let accessKey = "";
let services = [];
let fileSha = "";

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const decodeBase64 = (value) => {
  const bytes = Uint8Array.from(atob(value.replace(/\n/g, "")), (char) => char.charCodeAt(0));
  return new TextDecoder().decode(bytes);
};

const encodeBase64 = (value) => {
  const bytes = new TextEncoder().encode(value);
  let binary = "";
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte);
  });
  return btoa(binary);
};

const setStatus = (element, message = "", type = "") => {
  element.textContent = message;
  element.className = "status" + (type ? " " + type : "");
};

const apiRequest = async (path, options = {}) => {
  const response = await fetch(API_BASE + path, {
    ...options,
    headers: {
      Accept: "application/vnd.github+json",
      Authorization: "Bearer " + accessKey,
      "X-GitHub-Api-Version": "2022-11-28",
      ...(options.headers || {})
    }
  });

  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.message || "Falha ao acessar o GitHub");
  }

  return response.status === 204 ? null : response.json();
};

const fetchServicesFile = async () => {
  const data = await apiRequest(
    "/repos/" + REPOSITORY + "/contents/" + SERVICES_PATH + "?ref=" + encodeURIComponent(BRANCH)
  );

  fileSha = data.sha;
  services = JSON.parse(decodeBase64(data.content));
  if (!Array.isArray(services)) services = [];
};

const renderServices = () => {
  servicesCount.textContent = String(services.length);

  if (!services.length) {
    servicesList.innerHTML = '<div class="empty-state">Nenhum serviço cadastrado.</div>';
    return;
  }

  servicesList.innerHTML = services
    .map((service) => {
      const isActive = service.active !== false;

      return (
        '<article class="service-item' + (isActive ? "" : " inactive") + '">' +
          '<div class="service-item-heading">' +
            '<div>' +
              '<h3>' + escapeHtml(service.title) + '</h3>' +
              '<p>' + escapeHtml(service.description) + '</p>' +
            '</div>' +
            '<span class="badge' + (isActive ? "" : " inactive") + '">' +
              (isActive ? "Ativo" : "Oculto") +
            '</span>' +
          '</div>' +
          '<div class="service-actions">' +
            '<button type="button" data-action="edit" data-id="' + escapeHtml(service.id) + '">Editar</button>' +
            '<button class="delete" type="button" data-action="delete" data-id="' + escapeHtml(service.id) + '">Excluir</button>' +
          '</div>' +
        '</article>'
      );
    })
    .join("");
};

const resetForm = () => {
  serviceForm.reset();
  serviceId.value = "";
  serviceActive.checked = true;
  formTitle.textContent = "Novo serviço";
  saveButton.textContent = "Cadastrar serviço";
  cancelEdit.classList.add("hidden");
  setStatus(formStatus);
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

const writeServices = async (message) => {
  const response = await apiRequest(
    "/repos/" + REPOSITORY + "/contents/" + SERVICES_PATH,
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        message,
        content: encodeBase64(JSON.stringify(services, null, 2) + "\n"),
        sha: fileSha,
        branch: BRANCH
      })
    }
  );

  fileSha = response.content.sha;
};

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const submitButton = loginForm.querySelector("button[type='submit']");
  submitButton.disabled = true;
  setStatus(loginStatus, "Validando acesso...");
  accessKey = accessInput.value.trim();

  try {
    if (!accessKey) throw new Error("Informe a chave administrativa.");
    await apiRequest("/repos/" + REPOSITORY);
    await fetchServicesFile();
    renderServices();
    accessInput.value = "";
    loginView.classList.add("hidden");
    dashboardView.classList.remove("hidden");
    setStatus(loginStatus);
  } catch (error) {
    accessKey = "";
    setStatus(
      loginStatus,
      error.message === "Bad credentials" ? "Chave inválida ou expirada." : error.message,
      "error"
    );
  } finally {
    submitButton.disabled = false;
  }
});

logoutButton.addEventListener("click", () => {
  accessKey = "";
  services = [];
  fileSha = "";
  dashboardView.classList.add("hidden");
  loginView.classList.remove("hidden");
  resetForm();
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
    await fetchServicesFile();

    if (editingId) {
      const index = services.findIndex((item) => item.id === editingId);
      if (index < 0) throw new Error("Serviço não encontrado. Atualize a página.");

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

    await writeServices(
      editingId ? "content: atualiza serviço " + title : "content: adiciona serviço " + title
    );

    renderServices();
    resetForm();
    setStatus(formStatus, "Serviço salvo. O GitHub Pages atualizará o portfólio.", "success");
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
    window.scrollTo({ top: 0, behavior: "smooth" });
    return;
  }

  if (button.dataset.action === "delete") {
    const confirmed = window.confirm('Excluir o serviço "' + item.title + '"?');
    if (!confirmed) return;

    button.disabled = true;
    setStatus(formStatus, "Excluindo serviço...");

    try {
      await fetchServicesFile();
      const current = services.find((service) => service.id === item.id);
      if (!current) throw new Error("Serviço não encontrado. Atualize a página.");

      services = services.filter((service) => service.id !== item.id);
      await writeServices("content: remove serviço " + current.title);
      renderServices();

      if (serviceId.value === item.id) resetForm();
      setStatus(formStatus, "Serviço excluído com sucesso.", "success");
    } catch (error) {
      setStatus(formStatus, error.message, "error");
    } finally {
      button.disabled = false;
    }
  }
});

cancelEdit.addEventListener("click", resetForm);