import { logout } from "../firebase/auth.js";
import { ROLE_LABELS, ROUTE_PERMISSIONS, canAccess } from "../auth/roles.js";

const NAV_ITEMS = [
  { route: "dashboard", label: "Dashboard" },
  { route: "citas", label: "Citas" },
  { route: "pacientes", label: "Pacientes" },
  { route: "historias", label: "Historias clínicas" },
  { route: "atencion", label: "Atención médica" },
  { route: "inventario", label: "Inventario" },
  { route: "facturacion", label: "Facturación POS" },
  { route: "usuarios", label: "Usuarios" }
];

export function renderAppLayout(container, session, activeRoute) {
  const role = session.profile?.role;
  const visibleItems = NAV_ITEMS.filter((item) => canAccess(item.route, role));

  container.innerHTML = `
    <div class="min-h-screen lg:flex">
      <aside class="bg-slate-950 text-white lg:min-h-screen lg:w-72">
        <div class="flex items-center justify-between border-b border-white/10 p-5 lg:block">
          <div>
            <h1 class="text-2xl font-bold">Ecoalfa</h1>
            <p class="mt-1 text-sm text-emerald-200">Sistema integral</p>
          </div>
          <button id="mobile-menu-button" class="rounded-lg bg-white/10 px-3 py-2 text-sm lg:hidden">Menú</button>
        </div>

        <nav id="main-nav" class="hidden space-y-1 p-4 lg:block">
          ${visibleItems.map((item) => renderNavItem(item, activeRoute)).join("")}
        </nav>
      </aside>

      <div class="flex min-h-screen flex-1 flex-col">
        <header class="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
          <div>
            <p class="text-sm text-slate-500">Sesión activa</p>
            <h2 class="font-semibold text-slate-900">${session.profile?.displayName || session.user.email}</h2>
          </div>
          <div class="flex items-center gap-3">
            <span class="rounded-full bg-emerald-50 px-3 py-1 text-sm font-medium text-emerald-700">${ROLE_LABELS[role] || "Sin rol"}</span>
            <button id="logout-button" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Salir</button>
          </div>
        </header>

        <main id="view" class="flex-1 p-6"></main>
      </div>
    </div>
  `;

  document.querySelector("#logout-button").addEventListener("click", logout);
  document.querySelector("#mobile-menu-button")?.addEventListener("click", () => {
    document.querySelector("#main-nav")?.classList.toggle("hidden");
  });
}

export function getFirstAllowedRoute(role) {
  return Object.keys(ROUTE_PERMISSIONS).find((route) => canAccess(route, role)) || "dashboard";
}

function renderNavItem(item, activeRoute) {
  const isActive = item.route === activeRoute;
  const classes = isActive
    ? "bg-emerald-600 text-white"
    : "text-slate-300 hover:bg-white/10 hover:text-white";

  return `
    <a href="#${item.route}" class="block rounded-xl px-4 py-3 text-sm font-medium transition ${classes}">
      ${item.label}
    </a>
  `;
}
