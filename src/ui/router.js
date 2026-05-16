import { canAccess } from "../auth/roles.js";
import { renderCitasModule } from "../citas/citas.ui.js";
import { renderDashboardModule } from "../dashboard/dashboard.ui.js";
import { renderFacturacionModule } from "../facturacion/facturacion.ui.js";
import { renderHistoriasModule } from "../pacientes/historias.ui.js";
import { renderInventarioModule } from "../inventario/inventario.ui.js";
import { renderPacientesModule } from "../pacientes/pacientes.ui.js";
import { renderUsuariosModule } from "../usuarios/usuarios.ui.js";
import { getFirstAllowedRoute, renderAppLayout } from "./layout.js";
import {
  renderCitasView,
  renderDashboardView,
  renderFacturacionView,
  renderHistoriasView,
  renderInventarioView,
  renderPacientesView,
  renderUnauthorizedView,
  renderUsuariosView
} from "./views.js";

const ROUTES = {
  dashboard: renderDashboardView,
  citas: renderCitasView,
  pacientes: renderPacientesView,
  historias: renderHistoriasView,
  inventario: renderInventarioView,
  facturacion: renderFacturacionView,
  usuarios: renderUsuariosView
};

export function renderProtectedApp(container, session) {
  const role = session.profile?.role;
  const requestedRoute = getCurrentRoute();
  const activeRoute = canAccess(requestedRoute, role) ? requestedRoute : getFirstAllowedRoute(role);

  if (requestedRoute !== activeRoute) {
    window.location.hash = activeRoute;
  }

  renderAppLayout(container, session, activeRoute);
  renderRoute(activeRoute, role);
}

export function bindRouter(container, getSession) {
  window.addEventListener("hashchange", () => {
    const session = getSession();

    if (!session.user) {
      return;
    }

    renderProtectedApp(container, session);
  });
}

function renderRoute(route, role) {
  const view = document.querySelector("#view");

  if (!view) {
    return;
  }

  if (!canAccess(route, role)) {
    view.innerHTML = renderUnauthorizedView();
    return;
  }

  if (route === "dashboard") {
    renderDashboardModule(view);
    return;
  }

  if (route === "citas") {
    renderCitasModule(view);
    return;
  }

  if (route === "pacientes") {
    renderPacientesModule(view);
    return;
  }

  if (route === "historias") {
    renderHistoriasModule(view);
    return;
  }

  if (route === "inventario") {
    renderInventarioModule(view);
    return;
  }

  if (route === "facturacion") {
    renderFacturacionModule(view);
    return;
  }

  if (route === "usuarios") {
    renderUsuariosModule(view);
    return;
  }

  view.innerHTML = ROUTES[route]?.() || renderUnauthorizedView();
}

function getCurrentRoute() {
  return window.location.hash.replace("#", "") || "dashboard";
}
