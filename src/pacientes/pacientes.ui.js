import {
  getPatientByDocument,
  getPatientsPage,
  linkPatientToAuth,
  mergePatientRecords,
  searchPatientsByDocument,
  upsertPatient
} from "./pacientes.service.js";

let currentPatients = [];
let lastVisiblePatient = null;
let canLoadMorePatients = false;

export async function renderPacientesModule(container) {
  container.innerHTML = renderMainView();
  bindMainEvents(container);
}

function renderMainView() {
  return `
    <section class="space-y-6">
      <div>
        <h2 class="text-2xl font-bold text-slate-900">Pacientes</h2>
        <p class="text-slate-500">Gestión de pacientes y base de datos administrativa.</p>
      </div>

      <div class="grid gap-6 md:grid-cols-2">
        <button id="open-patient-form" class="group rounded-2xl bg-blue-600 p-8 text-left text-white shadow-lg transition hover:bg-blue-700 hover:shadow-xl">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-white/20 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold">Ficha del paciente</h3>
              <p class="mt-1 text-sm text-blue-100">Crear o editar ficha de paciente con datos completos.</p>
            </div>
          </div>
        </button>

        <button id="open-patient-database" class="group rounded-2xl bg-slate-700 p-8 text-left text-white shadow-lg transition hover:bg-slate-800 hover:shadow-xl">
          <div class="flex items-center gap-4">
            <div class="rounded-xl bg-white/20 p-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <h3 class="text-xl font-bold">Base de pacientes</h3>
              <p class="mt-1 text-sm text-slate-300">Buscar, ver y gestionar pacientes existentes.</p>
            </div>
          </div>
        </button>
      </div>

      <div class="grid gap-4 md:grid-cols-3">
        <article class="rounded-2xl bg-blue-50 p-5 text-blue-950 ring-1 ring-blue-100">
          <p class="text-sm font-medium text-blue-700">Origen</p>
          <strong class="mt-2 block text-2xl">Portal conectado</strong>
          <p class="mt-2 text-sm">Los pacientes inscritos desde citas quedan disponibles en esta base.</p>
        </article>
        <article class="rounded-2xl bg-sky-50 p-5 text-sky-950 ring-1 ring-sky-100">
          <p class="text-sm font-medium text-sky-700">Gestión</p>
          <strong class="mt-2 block text-2xl">Datos civiles</strong>
          <p class="mt-2 text-sm">Identificación, contacto, correo, fecha de nacimiento y dirección.</p>
        </article>
        <article class="rounded-2xl bg-lime-50 p-5 text-lime-950 ring-1 ring-lime-100">
          <p class="text-sm font-medium text-lime-700">Atención</p>
          <strong class="mt-2 block text-2xl">Historia aparte</strong>
          <p class="mt-2 text-sm">La atención médica se registra en el módulo Historias clínicas.</p>
        </article>
      </div>

      <!-- Modal Ficha del Paciente -->
      <div id="patient-form-modal" class="fixed inset-0 z-50 hidden bg-black/50 backdrop-blur-sm">
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h3 class="text-xl font-bold text-slate-900">Ficha del paciente</h3>
              <button id="close-form-modal" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form id="patient-form" class="space-y-4">
              <input id="patient-id" type="hidden" />
              
              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="firstName">Primer nombre *</label>
                  <input id="firstName" required class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="middleName">Segundo nombre</label>
                  <input id="middleName" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="firstLastName">Primer apellido *</label>
                  <input id="firstLastName" required class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="secondLastName">Segundo apellido</label>
                  <input id="secondLastName" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="documentType">Tipo de documento *</label>
                  <select id="documentType" required class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="CC">Cédula de Ciudadanía (CC)</option>
                    <option value="CE">Cédula de Extranjería (CE)</option>
                    <option value="TI">Tarjeta de Identidad (TI)</option>
                    <option value="PP">Pasaporte (PP)</option>
                    <option value="RC">Registro Civil (RC)</option>
                    <option value="NUIP">NUIP</option>
                    <option value="PEP">Permiso Especial (PEP)</option>
                  </select>
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="documentNumber">Número de documento *</label>
                  <input id="documentNumber" required class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="birthDate">Fecha de nacimiento</label>
                  <input id="birthDate" type="date" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="phone">Teléfono</label>
                  <input id="phone" type="tel" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for="email">Correo electrónico</label>
                <input id="email" type="email" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for="address">Dirección</label>
                <input id="address" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="eps">EPS</label>
                  <input id="eps" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="bloodType">Tipo de sangre</label>
                  <select id="bloodType" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100">
                    <option value="">Seleccione</option>
                    <option value="O+">O+</option>
                    <option value="O-">O-</option>
                    <option value="A+">A+</option>
                    <option value="A-">A-</option>
                    <option value="B+">B+</option>
                    <option value="B-">B-</option>
                    <option value="AB+">AB+</option>
                    <option value="AB-">AB-</option>
                  </select>
                </div>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="emergencyContactName">Contacto de emergencia</label>
                  <input id="emergencyContactName" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="emergencyContactPhone">Teléfono de emergencia</label>
                  <input id="emergencyContactPhone" type="tel" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for="allergies">Alergias</label>
                <textarea id="allergies" rows="2" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"></textarea>
              </div>

              <div class="grid gap-4 sm:grid-cols-2">
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="neighborhood">Barrio</label>
                  <input id="neighborhood" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
                <div>
                  <label class="mb-1 block text-sm font-medium text-slate-700" for="municipality">Municipio</label>
                  <input id="municipality" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
                </div>
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700">Género</label>
                <div class="flex gap-4">
                  <label class="flex items-center gap-2">
                    <input type="radio" name="gender" value="male" class="text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm text-slate-700">Masculino</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="gender" value="female" class="text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm text-slate-700">Femenino</span>
                  </label>
                  <label class="flex items-center gap-2">
                    <input type="radio" name="gender" value="other" class="text-blue-600 focus:ring-blue-500" />
                    <span class="text-sm text-slate-700">Otro</span>
                  </label>
                </div>
                <input id="customGender" placeholder="Especifique (opcional)" class="mt-2 w-full rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              </div>

              <div>
                <label class="mb-1 block text-sm font-medium text-slate-700" for="background">Notas administrativas</label>
                <textarea id="background" rows="3" class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100"></textarea>
              </div>

              <p id="patients-message" class="hidden rounded-xl px-4 py-3 text-sm"></p>

              <div class="flex gap-3 pt-4 border-t border-slate-200">
                <button class="flex-1 rounded-xl bg-blue-700 px-4 py-3 font-semibold text-white transition hover:bg-blue-800" type="submit">Guardar paciente</button>
                <button id="clear-patient-form" class="rounded-xl border border-slate-300 px-4 py-3 font-semibold text-slate-700 transition hover:bg-slate-50" type="button">Limpiar</button>
              </div>
            </form>
          </div>
        </div>
      </div>

      <!-- Modal Base de Pacientes -->
      <div id="patient-database-modal" class="fixed inset-0 z-50 hidden bg-black/50 backdrop-blur-sm">
        <div class="flex min-h-screen items-center justify-center p-4">
          <div class="w-full max-w-5xl max-h-[90vh] overflow-y-auto rounded-2xl bg-white p-6 shadow-2xl">
            <div class="flex items-center justify-between border-b border-slate-200 pb-4 mb-4">
              <h3 class="text-xl font-bold text-slate-900">Base de pacientes</h3>
              <button id="close-database-modal" class="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div class="mb-4 flex gap-2">
              <input id="patient-search" placeholder="Buscar por nombre o documento" class="flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-100" />
              <button id="search-patient" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Buscar</button>
              <button id="refresh-patients" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50">Todos</button>
            </div>

            <div id="patients-table" class="overflow-x-auto rounded-xl border border-slate-200">
              <div class="p-6 text-sm text-slate-500">Haga clic en "Todos" para cargar la base de pacientes.</div>
            </div>

            <div class="mt-4 flex justify-end">
              <button id="load-more-patients" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50" disabled>Cargar más</button>
            </div>
          </div>
        </div>
      </div>

      <div id="patient-success-modal" class="fixed inset-0 z-[60] hidden bg-slate-950/60 p-4 backdrop-blur-sm">
        <div class="flex min-h-screen items-center justify-center">
          <div class="w-full max-w-md rounded-3xl bg-white p-7 text-center shadow-2xl ring-1 ring-emerald-100">
            <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-100 text-emerald-700">
              <svg xmlns="http://www.w3.org/2000/svg" class="h-9 w-9" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2.5" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h3 class="mt-5 text-xl font-bold text-slate-950">Paciente guardado</h3>
            <p id="patient-success-text" class="mt-2 text-sm text-slate-500">La ficha del paciente se guardó correctamente.</p>
            <button id="close-success-modal" class="mt-6 w-full rounded-2xl bg-emerald-700 px-4 py-3 font-semibold text-white transition hover:bg-emerald-800" type="button">Entendido</button>
          </div>
        </div>
      </div>
    </section>
  `;
}

function bindMainEvents(container) {
  // Abrir modal de ficha
  container.querySelector("#open-patient-form").addEventListener("click", () => {
    container.querySelector("#patient-form-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
  });

  // Cerrar modal de ficha
  container.querySelector("#close-form-modal").addEventListener("click", () => {
    container.querySelector("#patient-form-modal").classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Cerrar modal al hacer click fuera
  container.querySelector("#patient-form-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      container.querySelector("#patient-form-modal").classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  // Abrir modal de base de pacientes
  container.querySelector("#open-patient-database").addEventListener("click", () => {
    container.querySelector("#patient-database-modal").classList.remove("hidden");
    document.body.style.overflow = "hidden";
    loadPatients(container, true);
  });

  // Cerrar modal de base
  container.querySelector("#close-database-modal").addEventListener("click", () => {
    container.querySelector("#patient-database-modal").classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Cerrar modal al hacer click fuera
  container.querySelector("#patient-database-modal").addEventListener("click", (e) => {
    if (e.target === e.currentTarget) {
      container.querySelector("#patient-database-modal").classList.add("hidden");
      document.body.style.overflow = "";
    }
  });

  // Formulario
  container.querySelector("#patient-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await savePatient(container, event.currentTarget);
  });

  container.querySelector("#clear-patient-form").addEventListener("click", () => resetPatientForm(container));

  container.querySelector("#close-success-modal").addEventListener("click", () => {
    container.querySelector("#patient-success-modal").classList.add("hidden");
    document.body.style.overflow = "";
  });

  // Búsqueda y paginación en modal
  container.querySelector("#refresh-patients").addEventListener("click", async () => loadPatients(container, true));
  container.querySelector("#load-more-patients").addEventListener("click", async () => loadPatients(container, false));
  container.querySelector("#search-patient").addEventListener("click", async () => searchPatients(container));

  // Enter en búsqueda
  container.querySelector("#patient-search").addEventListener("keypress", (e) => {
    if (e.key === "Enter") {
      searchPatients(container);
    }
  });
}

async function loadPatients(container, reset) {
  const table = container.querySelector("#patients-table");
  const loadMoreButton = container.querySelector("#load-more-patients");

  table.innerHTML = `<div class="p-6 text-sm text-slate-500"><div class="flex items-center gap-2"><div class="h-4 w-4 animate-spin rounded-full border-2 border-slate-300 border-t-blue-600"></div>Cargando pacientes...</div></div>`;

  if (reset) {
    currentPatients = [];
    lastVisiblePatient = null;
  }

  try {
    const page = await getPatientsPage(lastVisiblePatient);
    currentPatients = [...currentPatients, ...page.patients];
    lastVisiblePatient = page.lastVisible;
    canLoadMorePatients = page.hasMore;

    table.innerHTML = renderPatientsTable(currentPatients);
    loadMoreButton.disabled = !canLoadMorePatients;
    loadMoreButton.classList.toggle("opacity-50", !canLoadMorePatients);
    bindPatientsTableEvents(container);
  } catch (error) {
    table.innerHTML = `<div class="p-6 text-sm text-red-600">No fue posible cargar pacientes. Verifica permisos o índices.</div>`;
  }
}

async function searchPatients(container) {
  const term = container.querySelector("#patient-search").value;
  const table = container.querySelector("#patients-table");
  const loadMoreButton = container.querySelector("#load-more-patients");

  if (!term.trim()) {
    await loadPatients(container, true);
    return;
  }

  table.innerHTML = `<div class="p-6 text-sm text-slate-500">Buscando paciente...</div>`;
  currentPatients = await searchPatientsByDocument(term);
  table.innerHTML = renderPatientsTable(currentPatients);
  loadMoreButton.disabled = true;
  loadMoreButton.classList.add("opacity-50");
  bindPatientsTableEvents(container);
}

function renderPatientsTable(patients) {
  if (!patients.length) {
    return `<div class="p-6 text-sm text-slate-500">No hay pacientes para mostrar.</div>`;
  }

  return `
    <table class="min-w-full divide-y divide-slate-200 text-sm">
      <thead class="bg-slate-50 text-left text-xs uppercase tracking-wide text-slate-500">
        <tr>
          <th class="px-5 py-3">Paciente</th>
          <th class="px-5 py-3">Documento</th>
          <th class="px-5 py-3">Contacto</th>
          <th class="px-5 py-3">Origen</th>
          <th class="px-5 py-3">Portal</th>
          <th class="px-5 py-3 text-right">Acciones</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${patients.map(renderPatientRow).join("")}
      </tbody>
    </table>
  `;
}

function renderPatientRow(patient) {
  const sourceBadge = getSourceBadge(patient.source);
  const portalStatus = patient.authUid 
    ? `<span class="inline-flex items-center rounded-full bg-blue-100 px-2 py-1 text-xs font-medium text-blue-800">Vinculado</span>`
    : `<span class="inline-flex items-center rounded-full bg-amber-100 px-2 py-1 text-xs font-medium text-amber-800">Sin vincular</span>`;
  
  return `
    <tr>
      <td class="px-5 py-4 font-medium text-slate-900">${patient.fullName || "Sin nombre"}</td>
      <td class="px-5 py-4 text-slate-600">${patient.documentNumber || "Sin documento"}</td>
      <td class="px-5 py-4 text-slate-600">${patient.phone || patient.email || "Sin contacto"}</td>
      <td class="px-5 py-4">${sourceBadge}</td>
      <td class="px-5 py-4">${portalStatus}</td>
      <td class="relative px-5 py-4 text-right">
        <button data-toggle-actions="${patient.id}" class="inline-flex h-9 w-9 items-center justify-center rounded-full border border-slate-300 bg-white text-slate-600 shadow-sm hover:bg-slate-50" title="Acciones">
          ⚙
        </button>
        <div data-actions-menu="${patient.id}" class="absolute right-5 z-20 mt-2 hidden w-44 rounded-2xl border border-slate-200 bg-white p-2 text-left shadow-xl">
          <button data-edit-patient="${patient.id}" class="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-slate-700 hover:bg-slate-50">Editar</button>
          ${!patient.authUid ? `<button data-link-patient="${patient.id}" class="block w-full rounded-xl px-3 py-2 text-left text-xs font-semibold text-blue-700 hover:bg-blue-50">Vincular portal</button>` : ""}
        </div>
      </td>
    </tr>
  `;
}

function getSourceBadge(source) {
  const badges = {
    manual: `<span class="inline-flex items-center rounded-full bg-slate-100 px-2 py-1 text-xs font-medium text-slate-700">Interno</span>`,
    patient_portal: `<span class="inline-flex items-center rounded-full bg-sky-100 px-2 py-1 text-xs font-medium text-sky-700">Portal</span>`,
    linked: `<span class="inline-flex items-center rounded-full bg-emerald-100 px-2 py-1 text-xs font-medium text-emerald-700">Vinculado</span>`
  };
  return badges[source] || badges.manual;
}

function bindPatientsTableEvents(container) {
  container.querySelectorAll("[data-toggle-actions]").forEach((button) => {
    button.addEventListener("click", (event) => {
      event.stopPropagation();
      const menu = container.querySelector(`[data-actions-menu="${button.dataset.toggleActions}"]`);
      container.querySelectorAll("[data-actions-menu]").forEach((item) => {
        if (item !== menu) item.classList.add("hidden");
      });
      menu?.classList.toggle("hidden");
    });
  });

  container.querySelectorAll("[data-edit-patient]").forEach((button) => {
    button.addEventListener("click", () => {
      fillPatientForm(container, button.dataset.editPatient);
      // Cerrar modal de base y abrir modal de formulario
      container.querySelector("#patient-database-modal").classList.add("hidden");
      container.querySelector("#patient-form-modal").classList.remove("hidden");
    });
  });

  container.querySelectorAll("[data-link-patient]").forEach((button) => {
    button.addEventListener("click", () => linkPatientToPortal(container, button.dataset.linkPatient));
  });

  document.addEventListener("click", () => {
    container.querySelectorAll("[data-actions-menu]").forEach((item) => item.classList.add("hidden"));
  }, { once: true });
}

async function linkPatientToPortal(container, patientId) {
  const patient = currentPatients.find((p) => p.id === patientId);
  if (!patient) return;

  const email = prompt(`Vincular paciente: ${patient.fullName}\n\nIngresa el correo del usuario registrado en el portal:`);
  if (!email || !email.includes("@")) {
    showMessage(container, "Correo inválido. Debe ser un correo válido.", "error");
    return;
  }

  try {
    showMessage(container, "Buscando paciente en portal...", "success");
    
    const portalPatient = await getPatientByDocument(patient.documentNumber);
    
    if (!portalPatient) {
      showMessage(container, "No se encontró paciente con ese documento en el portal. El usuario debe registrarse primero en citas.html", "error");
      return;
    }

    if (portalPatient.id === patientId) {
      showMessage(container, "Este paciente ya es el registro principal.", "error");
      return;
    }

    if (!portalPatient.authUid) {
      showMessage(container, "El paciente del portal no tiene cuenta de autenticación vinculada.", "error");
      return;
    }

    const confirmMerge = confirm(
      `Se encontró paciente en portal:\n${portalPatient.fullName}\nCorreo: ${portalPatient.email}\n\n` +
      `¿Deseas vincular y migrar el historial clínico?\n\n` +
      `- El paciente interno quedará como principal\n` +
      `- Se migrarán ${portalPatient.recordCount || "las"} historias clínicas del portal\n` +
      `- El registro del portal se marcará como vinculado`
    );

    if (!confirmMerge) return;

    showMessage(container, "Vinculando y migrando historial...", "success");

    await linkPatientToAuth(patientId, portalPatient.authUid, portalPatient.email);
    
    const migratedCount = await mergePatientRecords(portalPatient.id, patientId);
    
    showMessage(container, `Paciente vinculado exitosamente. ${migratedCount} registros migrados.`, "success");
    
    await loadPatients(container, true);
  } catch (error) {
    console.error("Error vinculando paciente:", error);
    showMessage(container, `Error: ${error.message || "No fue posible vincular"}`, "error");
  }
}

function fillPatientForm(container, patientId) {
  const patient = currentPatients.find((item) => item.id === patientId);
  if (!patient) return;
  
  const form = container.querySelector("#patient-form");

  form.querySelector("#patient-id").value = patient.id;
  
  // Separar nombre completo en partes (mejor aproximación)
  const nameParts = (patient.fullName || "").split(" ");
  form.firstName.value = nameParts[0] || "";
  form.middleName.value = nameParts[1] || "";
  form.firstLastName.value = nameParts[2] || "";
  form.secondLastName.value = nameParts[3] || "";
  
  form.documentType.value = patient.documentType || "CC";
  form.documentNumber.value = patient.documentNumber || "";
  form.phone.value = patient.phone || "";
  form.email.value = patient.email || "";
  form.birthDate.value = patient.birthDate || "";
  form.address.value = patient.address || "";
  form.eps.value = patient.eps || "";
  form.bloodType.value = patient.bloodType || "";
  form.emergencyContactName.value = patient.emergencyContactName || "";
  form.emergencyContactPhone.value = patient.emergencyContactPhone || "";
  form.allergies.value = patient.allergies || "";
  form.neighborhood.value = patient.neighborhood || "";
  form.municipality.value = patient.municipality || "";
  form.background.value = patient.background || "";
  
  // Género
  if (patient.gender) {
    const genderRadio = form.querySelector(`[name="gender"][value="${patient.gender}"]`);
    if (genderRadio) genderRadio.checked = true;
    if (patient.gender === "other" && patient.customGender) {
      form.customGender.value = patient.customGender;
    }
  }
}

async function savePatient(container, form) {
  try {
    // Construir nombre completo
    const fullName = [
      form.firstName.value,
      form.middleName.value,
      form.firstLastName.value,
      form.secondLastName.value
    ].filter(Boolean).join(" ");

    const gender = form.querySelector('[name="gender"]:checked')?.value || "";

    const patientId = await upsertPatient(form.querySelector("#patient-id").value, {
      firstName: form.firstName.value,
      middleName: form.middleName.value,
      firstLastName: form.firstLastName.value,
      secondLastName: form.secondLastName.value,
      fullName: fullName,
      documentType: form.documentType.value,
      documentNumber: form.documentNumber.value,
      phone: form.phone.value,
      email: form.email.value,
      birthDate: form.birthDate.value,
      address: form.address.value,
      eps: form.eps.value,
      bloodType: form.bloodType.value,
      emergencyContactName: form.emergencyContactName.value,
      emergencyContactPhone: form.emergencyContactPhone.value,
      allergies: form.allergies.value,
      neighborhood: form.neighborhood.value,
      municipality: form.municipality.value,
      gender: gender,
      customGender: form.customGender.value,
      background: form.background.value,
      source: "manual"
    });

    const savedPatientName = fullName || "Paciente";
    resetPatientForm(container);
    container.querySelector("#patient-form-modal").classList.add("hidden");
    container.querySelector("#patient-success-text").textContent = `${savedPatientName} quedó guardado correctamente en la base de pacientes.`;
    container.querySelector("#patient-success-modal").classList.remove("hidden");
    
    // Si estábamos en el modal de base, recargar
    if (!container.querySelector("#patient-database-modal").classList.contains("hidden")) {
      await loadPatients(container, true);
    }

  } catch (error) {
    showMessage(container, "No fue posible guardar el paciente. Verifica permisos y datos.", "error");
  }
}

function resetPatientForm(container) {
  const form = container.querySelector("#patient-form");
  form.reset();
  form.querySelector("#patient-id").value = "";
}

function showMessage(container, message, type) {
  const messageBox = container.querySelector("#patients-message");
  const classes = type === "success" ? "bg-blue-50 text-blue-700" : "bg-red-50 text-red-700";

  messageBox.className = `rounded-xl px-4 py-3 text-sm ${classes}`;
  messageBox.textContent = message;
  messageBox.classList.remove("hidden");
  
  // Auto-ocultar después de 3 segundos
  setTimeout(() => {
    messageBox.classList.add("hidden");
  }, 3000);
}
