const servicesGrid = document.querySelector("#services-grid");

const escapeHtml = (value = "") =>
  value.replace(/[&<>"']/g, (char) => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#039;"
  }[char]));

const buildWhatsappLink = (serviceTitle) =>
  "https://wa.me/5511972670073?text=" +
  encodeURIComponent(
    "Olá, Reginaldo. Gostaria de conversar sobre o serviço: " + serviceTitle + "."
  );

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

loadServices();