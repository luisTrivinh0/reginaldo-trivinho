const servicesGrid = document.querySelector("#services-grid");
const siteConfig = window.SITE_CONFIG || {};
const contact = siteConfig.contact || {};
const brand = siteConfig.brand || {};

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const whatsappLink = (message) =>
  "https://wa.me/" +
  (contact.phoneE164 || "") +
  "?text=" +
  encodeURIComponent(message || contact.whatsappMessage || "");

const buildWhatsappLink = (serviceTitle) =>
  whatsappLink(
    "Olá, " +
      (brand.name ? brand.name.split(" ")[0] : "") +
      ". Gostaria de conversar sobre o serviço: " +
      serviceTitle +
      "."
  );

const applySiteConfig = () => {
  document.querySelectorAll("[data-site-name]").forEach((element) => {
    element.textContent = brand.name || element.textContent;
  });

  document.querySelectorAll("[data-site-role]").forEach((element) => {
    element.textContent = brand.role || element.textContent;
  });

  document.querySelectorAll("[data-site-initials]").forEach((element) => {
    element.textContent = brand.initials || element.textContent;
  });

  document.querySelectorAll("[data-whatsapp-link]").forEach((element) => {
    element.href = whatsappLink();
  });

  document.querySelectorAll("[data-phone-link]").forEach((element) => {
    element.href = "tel:+" + (contact.phoneE164 || "");
  });

  document.querySelectorAll("[data-phone-display]").forEach((element) => {
    element.textContent = contact.phoneDisplay || element.textContent;
  });

  document.querySelectorAll("[data-email-primary]").forEach((element) => {
    if (!contact.emailPrimary) return;
    element.href = "mailto:" + contact.emailPrimary;
    element.textContent = contact.emailPrimary;
  });

  document.querySelectorAll("[data-email-secondary]").forEach((element) => {
    if (!contact.emailSecondary) return;
    element.href = "mailto:" + contact.emailSecondary;
    element.textContent = contact.emailSecondary;
  });

  document.querySelectorAll("[data-powered-by]").forEach((element) => {
    if (!siteConfig.poweredBy) return;
    element.textContent = siteConfig.poweredBy.label || element.textContent;
    element.href = siteConfig.poweredBy.url || element.href;
  });
};

const renderServices = (services) => {
  if (!services.length) {
    servicesGrid.innerHTML =
      '<div class="empty-services">Nenhum serviço cadastrado no momento.</div>';
    return;
  }

  servicesGrid.innerHTML = services
    .map((service, index) => {
      const points =
        Array.isArray(service.points) && service.points.length
          ? `<div class="service-points">${service.points
              .map((point) => `<span>${escapeHtml(point)}</span>`)
              .join("")}</div>`
          : "";

      return `
        <article class="service-card">
          <span class="service-index">${String(index + 1).padStart(2, "0")}</span>
          <h3>${escapeHtml(service.title)}</h3>
          <p>${escapeHtml(service.description)}</p>
          ${points}
          <a
            class="service-link"
            href="${buildWhatsappLink(service.title)}"
            target="_blank"
            rel="noreferrer"
          >
            Conversar sobre este serviço
          </a>
        </article>
      `;
    })
    .join("");
};

const loadServices = async () => {
  try {
    const response = await fetch(`./data/services.json?v=${Date.now()}`);
    if (!response.ok) throw new Error("Falha ao carregar os serviços");

    const services = await response.json();
    renderServices(
      Array.isArray(services)
        ? services.filter((item) => item.active !== false)
        : []
    );
  } catch {
    servicesGrid.innerHTML =
      '<div class="empty-services">Não foi possível carregar os serviços agora.</div>';
  }
};

applySiteConfig();
loadServices();
