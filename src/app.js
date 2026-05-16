import { renderLogin } from "./auth/login.ui.js";
import { getSession, subscribeSession } from "./auth/session.js";
import { bindRouter, renderProtectedApp } from "./ui/router.js";

const appContainer = document.querySelector("#app");

bindRouter(appContainer, getSession);

subscribeSession((session) => {
  if (!session.user) {
    renderLogin(appContainer);
    return;
  }

  if (!session.profile || session.profile.active === false) {
    appContainer.innerHTML = `
      <main class="min-h-screen grid place-items-center bg-slate-100 p-6">
        <section class="max-w-lg rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
          <h1 class="text-2xl font-bold text-slate-900">Usuario sin acceso</h1>
          <p class="mt-2 text-slate-500">Tu perfil no está activo o no tiene un rol asignado. Contacta al administrador.</p>
        </section>
      </main>
    `;
    return;
  }

  renderProtectedApp(appContainer, session);
});
