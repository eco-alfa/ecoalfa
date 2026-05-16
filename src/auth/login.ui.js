import { loginWithEmail } from "../firebase/auth.js";

export function renderLogin(container) {
  container.innerHTML = `
    <main class="min-h-screen grid place-items-center bg-gradient-to-br from-emerald-900 via-teal-800 to-slate-950 p-6">
      <section class="w-full max-w-md rounded-3xl bg-white p-8 shadow-2xl">
        <div class="mb-8 text-center">
          <div class="mx-auto mb-4 grid h-16 w-16 place-items-center rounded-2xl bg-emerald-100 text-3xl">E</div>
          <h1 class="text-3xl font-bold text-slate-900">Ecoalfa</h1>
          <p class="mt-2 text-sm text-slate-500">ERP/CRM para medicina homeopática</p>
        </div>

        <form id="login-form" class="space-y-4">
          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="email">Correo electrónico</label>
            <input id="email" type="email" required class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autocomplete="email" />
          </div>

          <div>
            <label class="mb-1 block text-sm font-medium text-slate-700" for="password">Contraseña</label>
            <input id="password" type="password" required class="w-full rounded-xl border border-slate-300 px-4 py-3 outline-none transition focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" autocomplete="current-password" />
          </div>

          <p id="login-error" class="hidden rounded-xl bg-red-50 px-4 py-3 text-sm text-red-700"></p>

          <button id="login-button" class="w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800 disabled:cursor-not-allowed disabled:opacity-60" type="submit">
            Ingresar
          </button>
        </form>
      </section>
    </main>
  `;

  const form = document.querySelector("#login-form");
  const errorBox = document.querySelector("#login-error");
  const loginButton = document.querySelector("#login-button");

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    errorBox.classList.add("hidden");
    loginButton.disabled = true;
    loginButton.textContent = "Ingresando...";

    const email = form.email.value.trim();
    const password = form.password.value;

    try {
      await loginWithEmail(email, password);
    } catch (error) {
      errorBox.textContent = getLoginErrorMessage(error);
      errorBox.classList.remove("hidden");
    } finally {
      loginButton.disabled = false;
      loginButton.textContent = "Ingresar";
    }
  });
}

function getLoginErrorMessage(error) {
  const messages = {
    "auth/invalid-email": "El correo no tiene un formato válido.",
    "auth/invalid-credential": "Correo o contraseña incorrectos.",
    "auth/user-not-found": "No existe un usuario con este correo en Firebase Authentication.",
    "auth/wrong-password": "La contraseña es incorrecta.",
    "auth/too-many-requests": "Demasiados intentos fallidos. Intenta nuevamente más tarde.",
    "auth/operation-not-allowed": "El proveedor Email/Password no está habilitado en Firebase Authentication.",
    "auth/network-request-failed": "No se pudo conectar con Firebase. Revisa internet, dominio autorizado o bloqueos del navegador."
  };

  return messages[error.code] || `No fue posible iniciar sesión. Código: ${error.code || "desconocido"}`;
}
