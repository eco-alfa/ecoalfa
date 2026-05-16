import {
  createClinicalRecord,
  getClinicalRecords,
  getPatientById,
  getPatientsPage,
  searchPatientsByDocument
} from "./pacientes.service.js";

let currentPatients = [];
let currentRecords = [];
let selectedPatient = null;
let lastVisiblePatient = null;
let lastVisibleRecord = null;
let canLoadMorePatients = false;
let canLoadMoreRecords = false;

export async function renderHistoriasModule(container) {
  container.innerHTML = renderShell();
  bindEvents(container);
  await loadPatients(container, true);
  await selectStoredPatient(container);
}

function renderShell() {
  return `
    <section class="space-y-6">
      <div class="overflow-hidden rounded-[2rem] bg-slate-950 text-white shadow-sm ring-1 ring-slate-800">
        <div class="grid gap-6 p-6 lg:grid-cols-[1fr_360px] lg:items-center">
          <div>
            <p class="text-sm font-semibold uppercase tracking-[0.3em] text-emerald-300">EMR Ecoalfa</p>
            <h2 class="mt-3 text-3xl font-black tracking-tight lg:text-5xl">Historia clínica profesional</h2>
            <p class="mt-4 max-w-3xl text-slate-300">Módulo médico para consulta, evolución, diagnóstico, prescripción, seguimiento y generación de PDF por visita.</p>
          </div>
          <div class="grid grid-cols-3 gap-3 text-center">
            <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><strong class="block text-2xl">SOAP</strong><span class="text-xs text-slate-300">Evolución</span></div>
            <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><strong class="block text-2xl">PDF</strong><span class="text-xs text-slate-300">Soporte</span></div>
            <div class="rounded-2xl bg-white/10 p-4 ring-1 ring-white/10"><strong class="block text-2xl">CIE</strong><span class="text-xs text-slate-300">Diagnóstico</span></div>
          </div>
        </div>
      </div>

      <div class="grid gap-6 2xl:grid-cols-[360px_1fr]">
        <aside class="space-y-4">
          <div class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
            <h3 class="font-semibold text-slate-900">Buscar paciente</h3>
            <p class="mt-1 text-sm text-slate-500">Selecciona un paciente registrado desde Pacientes o el portal de citas.</p>
            <div class="mt-4 flex gap-2">
              <input id="history-patient-search" placeholder="Documento" class="min-w-0 flex-1 rounded-xl border border-slate-300 px-4 py-2 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
              <button id="history-search-patient" class="rounded-xl bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Buscar</button>
            </div>
          </div>

          <div class="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div class="flex items-center justify-between border-b border-slate-200 p-4">
              <h3 class="font-semibold text-slate-900">Pacientes</h3>
              <button id="history-refresh-patients" class="text-sm font-medium text-emerald-700">Todos</button>
            </div>
            <div id="history-patients-list" class="max-h-[620px] overflow-y-auto p-3"></div>
            <div class="border-t border-slate-200 p-3 text-right">
              <button id="history-load-more-patients" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700">Cargar más</button>
            </div>
          </div>
        </aside>

        <div id="clinical-workspace" class="min-h-[700px] rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          ${renderEmptyWorkspace()}
        </div>
      </div>
    </section>
  `;
}

function bindEvents(container) {
  container.querySelector("#history-refresh-patients").addEventListener("click", async () => loadPatients(container, true));
  container.querySelector("#history-load-more-patients").addEventListener("click", async () => loadPatients(container, false));
  container.querySelector("#history-search-patient").addEventListener("click", async () => searchPatients(container));
}

async function loadPatients(container, reset) {
  const list = container.querySelector("#history-patients-list");
  const loadMoreButton = container.querySelector("#history-load-more-patients");

  if (reset) {
    currentPatients = [];
    lastVisiblePatient = null;
  }

  list.innerHTML = `<div class="p-4 text-sm text-slate-500">Cargando pacientes...</div>`;

  try {
    const page = await getPatientsPage(lastVisiblePatient);
    currentPatients = [...currentPatients, ...page.patients];
    lastVisiblePatient = page.lastVisible;
    canLoadMorePatients = page.hasMore;

    list.innerHTML = renderPatientCards(currentPatients);
    loadMoreButton.disabled = !canLoadMorePatients;
    loadMoreButton.classList.toggle("opacity-50", !canLoadMorePatients);
    bindPatientCards(container);
  } catch (error) {
    list.innerHTML = `<div class="p-4 text-sm text-red-600">No fue posible cargar pacientes.</div>`;
  }
}

async function searchPatients(container) {
  const term = container.querySelector("#history-patient-search").value;
  const list = container.querySelector("#history-patients-list");
  const loadMoreButton = container.querySelector("#history-load-more-patients");

  if (!term.trim()) {
    await loadPatients(container, true);
    return;
  }

  list.innerHTML = `<div class="p-4 text-sm text-slate-500">Buscando paciente...</div>`;
  currentPatients = await searchPatientsByDocument(term);
  list.innerHTML = renderPatientCards(currentPatients);
  loadMoreButton.disabled = true;
  loadMoreButton.classList.add("opacity-50");
  bindPatientCards(container);
}

function renderPatientCards(patients) {
  if (!patients.length) {
    return `<div class="p-4 text-sm text-slate-500">No hay pacientes disponibles.</div>`;
  }

  return patients.map((patient) => `
    <button data-select-patient="${patient.id}" class="mb-2 w-full rounded-2xl border border-slate-200 p-4 text-left transition hover:border-emerald-300 hover:bg-emerald-50">
      <strong class="block text-sm text-slate-900">${patient.fullName || "Sin nombre"}</strong>
      <span class="mt-1 block text-xs text-slate-500">${patient.documentNumber || "Sin documento"}</span>
      <span class="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-600">${patient.phone || patient.email || "Sin contacto"}</span>
    </button>
  `).join("");
}

function bindPatientCards(container) {
  container.querySelectorAll("[data-select-patient]").forEach((button) => {
    button.addEventListener("click", async () => selectPatient(container, button.dataset.selectPatient));
  });
}

async function selectStoredPatient(container) {
  const storedPatientId = sessionStorage.getItem("ecoalfa:selectedPatientId");

  if (!storedPatientId) {
    return;
  }

  sessionStorage.removeItem("ecoalfa:selectedPatientId");

  if (currentPatients.some((patient) => patient.id === storedPatientId)) {
    await selectPatient(container, storedPatientId);
    return;
  }

  const patient = await getPatientById(storedPatientId);

  if (patient) {
    currentPatients = [patient, ...currentPatients];
    container.querySelector("#history-patients-list").innerHTML = renderPatientCards(currentPatients);
    bindPatientCards(container);
    await selectPatient(container, patient.id);
  }
}

async function selectPatient(container, patientId) {
  selectedPatient = currentPatients.find((patient) => patient.id === patientId);
  currentRecords = [];
  lastVisibleRecord = null;
  renderWorkspace(container);
  await loadRecords(container, true);
}

function renderWorkspace(container) {
  const workspace = container.querySelector("#clinical-workspace");

  if (!selectedPatient) {
    workspace.innerHTML = renderEmptyWorkspace();
    return;
  }

  workspace.innerHTML = `
    <div class="mb-6 grid gap-4 lg:grid-cols-[1fr_260px]">
      <div class="rounded-3xl bg-gradient-to-br from-emerald-50 to-sky-50 p-5 ring-1 ring-emerald-100">
        <p class="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-700">Paciente seleccionado</p>
        <h3 class="mt-2 text-2xl font-black text-slate-950">${selectedPatient.fullName || "Sin nombre"}</h3>
        <div class="mt-3 grid gap-2 text-sm text-slate-600 sm:grid-cols-3">
          <span>Documento: <strong>${selectedPatient.documentNumber || "N/A"}</strong></span>
          <span>Teléfono: <strong>${selectedPatient.phone || "N/A"}</strong></span>
          <span>Correo: <strong>${selectedPatient.email || "N/A"}</strong></span>
        </div>
      </div>
      <div class="rounded-3xl bg-slate-950 p-5 text-white">
        <p class="text-sm text-slate-300">Acciones clínicas</p>
        <button id="load-more-records" class="mt-4 w-full rounded-xl bg-white/10 px-4 py-3 text-sm font-semibold ring-1 ring-white/10 hover:bg-white/20">Cargar más visitas</button>
      </div>
    </div>

    <div class="grid gap-6 xl:grid-cols-[1fr_420px]">
      <section class="rounded-3xl border border-slate-200 bg-slate-50 p-5">
        <div class="mb-5 flex items-center justify-between">
          <div>
            <h3 class="text-lg font-bold text-slate-900">Línea de tiempo clínica</h3>
            <p class="text-sm text-slate-500">Evoluciones y visitas registradas.</p>
          </div>
        </div>
        <div id="clinical-records-list" class="space-y-4"></div>
      </section>

      <form id="clinical-record-form" class="rounded-3xl border border-emerald-100 bg-white p-5 shadow-sm">
        <h3 class="text-lg font-bold text-slate-900">Nueva atención médica</h3>
        <p class="mt-1 text-sm text-slate-500">Registro por visita con estructura clínica.</p>

        <div class="mt-5 grid gap-3 sm:grid-cols-2">
          ${renderInput("record-consultationDate", "Fecha", "date", true)}
          ${renderInput("record-doctorName", "Médico tratante", "text", false)}
          ${renderInput("record-cie10", "CIE-10", "text", false)}
          ${renderInput("record-nextControl", "Próximo control", "date", false)}
        </div>

        <div class="mt-4 space-y-3">
          ${renderTextarea("record-reason", "Motivo de consulta", true, 2)}
          ${renderTextarea("record-currentIllness", "Enfermedad actual", true, 3)}
          ${renderTextarea("record-personalHistory", "Antecedentes relevantes", false, 2)}
        </div>

        <div class="mt-4 grid gap-3 sm:grid-cols-4">
          ${renderInput("record-bloodPressure", "TA", "text", false)}
          ${renderInput("record-heartRate", "FC", "text", false)}
          ${renderInput("record-temperature", "Temp.", "text", false)}
          ${renderInput("record-weight", "Peso", "text", false)}
        </div>

        <div class="mt-4 space-y-3">
          ${renderTextarea("record-physicalExam", "Examen físico", false, 3)}
          ${renderTextarea("record-diagnosis", "Diagnóstico", true, 2)}
          ${renderTextarea("record-treatmentPlan", "Plan de manejo", false, 2)}
          ${renderTextarea("record-prescription", "Prescripción / fórmula", true, 3)}
          ${renderTextarea("record-recommendations", "Recomendaciones", false, 2)}
        </div>

        <p id="clinical-message" class="mt-4 hidden rounded-xl px-4 py-3 text-sm"></p>
        <button class="mt-4 w-full rounded-xl bg-emerald-700 px-4 py-3 font-semibold text-white hover:bg-emerald-800" type="submit">Guardar visita clínica</button>
      </form>
    </div>
  `;

  workspace.querySelector("#clinical-record-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    await saveClinicalRecord(container, event.currentTarget);
  });

  workspace.querySelector("#load-more-records").addEventListener("click", async () => loadRecords(container, false));
}

async function loadRecords(container, reset) {
  const list = container.querySelector("#clinical-records-list");
  const loadMoreButton = container.querySelector("#load-more-records");

  if (!selectedPatient || !list) {
    return;
  }

  if (reset) {
    currentRecords = [];
    lastVisibleRecord = null;
  }

  list.innerHTML = `<div class="text-sm text-slate-500">Cargando historia clínica...</div>`;

  try {
    const page = await getClinicalRecords(selectedPatient.id, lastVisibleRecord);
    currentRecords = [...currentRecords, ...page.records];
    lastVisibleRecord = page.lastVisible;
    canLoadMoreRecords = page.hasMore;

    list.innerHTML = renderRecordsList(currentRecords);
    loadMoreButton.disabled = !canLoadMoreRecords;
    loadMoreButton.classList.toggle("opacity-50", !canLoadMoreRecords);
    bindPdfButtons();
  } catch (error) {
    list.innerHTML = `<div class="text-sm text-red-600">No fue posible cargar la historia clínica.</div>`;
  }
}

function renderRecordsList(records) {
  if (!records.length) {
    return `<div class="rounded-2xl border border-dashed border-slate-300 bg-white p-6 text-sm text-slate-500">Sin visitas clínicas registradas.</div>`;
  }

  return records.map((record) => `
    <article class="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div class="mb-4 flex flex-col justify-between gap-3 lg:flex-row lg:items-start">
        <div>
          <span class="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">${record.consultationDate || formatDate(record.createdAt)}</span>
          <h4 class="mt-3 text-lg font-bold text-slate-950">${record.diagnosis || "Consulta médica"}</h4>
          <p class="text-sm text-slate-500">${record.doctorName || "Profesional no especificado"} ${record.cie10 ? `· CIE-10 ${record.cie10}` : ""}</p>
        </div>
        <button data-print-record="${record.id}" class="rounded-xl border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50">PDF</button>
      </div>
      <div class="grid gap-3 text-sm lg:grid-cols-2">
        ${renderRecordField("Subjetivo", record.reason)}
        ${renderRecordField("Enfermedad actual", record.currentIllness)}
        ${renderRecordField("Objetivo / examen", record.physicalExam)}
        ${renderRecordField("Plan", record.treatmentPlan)}
      </div>
      <div class="mt-4 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-950">
        <strong class="block">Prescripción</strong>
        <p class="mt-1 whitespace-pre-wrap">${record.prescription || "Sin prescripción"}</p>
      </div>
    </article>
  `).join("");
}

async function saveClinicalRecord(container, form) {
  try {
    await createClinicalRecord(selectedPatient.id, {
      consultationDate: form.querySelector("#record-consultationDate").value,
      doctorName: form.querySelector("#record-doctorName").value,
      cie10: form.querySelector("#record-cie10").value,
      nextControl: form.querySelector("#record-nextControl").value,
      reason: form.querySelector("#record-reason").value,
      currentIllness: form.querySelector("#record-currentIllness").value,
      personalHistory: form.querySelector("#record-personalHistory").value,
      bloodPressure: form.querySelector("#record-bloodPressure").value,
      heartRate: form.querySelector("#record-heartRate").value,
      temperature: form.querySelector("#record-temperature").value,
      weight: form.querySelector("#record-weight").value,
      systemsReview: "",
      physicalExam: form.querySelector("#record-physicalExam").value,
      diagnosis: form.querySelector("#record-diagnosis").value,
      treatmentPlan: form.querySelector("#record-treatmentPlan").value,
      prescription: form.querySelector("#record-prescription").value,
      recommendations: form.querySelector("#record-recommendations").value
    });

    form.reset();
    await loadRecords(container, true);
    showClinicalMessage(container, "Visita clínica guardada correctamente.", "success");
  } catch (error) {
    showClinicalMessage(container, "No fue posible guardar la visita clínica.", "error");
  }
}

function bindPdfButtons() {
  document.querySelectorAll("[data-print-record]").forEach((button) => {
    button.addEventListener("click", () => {
      const record = currentRecords.find((item) => item.id === button.dataset.printRecord);
      if (record) {
        printRecord(record);
      }
    });
  });
}

function printRecord(record) {
  const printWindow = window.open("", "_blank", "width=900,height=1100");
  const patientName = selectedPatient?.fullName || "Paciente";
  const documentNumber = selectedPatient?.documentNumber || "";

  printWindow.document.write(`
    <!doctype html>
    <html lang="es">
      <head>
        <meta charset="UTF-8" />
        <title>Historia clínica - ${patientName}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; margin: 32px; }
          header { display: flex; justify-content: space-between; align-items: center; border-bottom: 3px solid #047857; padding-bottom: 18px; margin-bottom: 24px; }
          img { width: 96px; height: 96px; object-fit: contain; }
          h1 { margin: 0; font-size: 24px; }
          h2 { margin-top: 24px; color: #047857; border-bottom: 1px solid #d1fae5; padding-bottom: 6px; }
          .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 12px; }
          .box { border: 1px solid #e2e8f0; border-radius: 12px; padding: 12px; margin-bottom: 10px; white-space: pre-wrap; }
          .label { font-size: 11px; color: #64748b; text-transform: uppercase; margin-bottom: 4px; font-weight: 700; }
          button { border: 0; border-radius: 12px; background: #047857; color: white; padding: 12px 18px; font-weight: 700; }
          @media print { button { display: none; } body { margin: 18mm; } }
        </style>
      </head>
      <body>
        <header>
          <div>
            <h1>Historia clínica - Ecoalfa</h1>
            <p>Paciente: <strong>${patientName}</strong><br/>Documento: <strong>${documentNumber}</strong><br/>Fecha: <strong>${record.consultationDate || formatDate(record.createdAt)}</strong></p>
          </div>
          <img src="./assets/ecoalfa-logo.jpeg" alt="Ecoalfa" />
        </header>
        <section class="grid">
          ${pdfField("Profesional", record.doctorName)}
          ${pdfField("CIE-10", record.cie10)}
          ${pdfField("Motivo", record.reason)}
          ${pdfField("Enfermedad actual", record.currentIllness)}
        </section>
        <h2>Signos vitales</h2>
        <section class="grid">
          ${pdfField("TA", record.vitalSigns?.bloodPressure)}
          ${pdfField("FC", record.vitalSigns?.heartRate)}
          ${pdfField("Temperatura", record.vitalSigns?.temperature)}
          ${pdfField("Peso", record.vitalSigns?.weight)}
        </section>
        <h2>Evaluación y plan</h2>
        ${pdfBlock("Antecedentes", record.personalHistory)}
        ${pdfBlock("Examen físico", record.physicalExam)}
        ${pdfBlock("Diagnóstico", record.diagnosis)}
        ${pdfBlock("Plan", record.treatmentPlan)}
        ${pdfBlock("Prescripción", record.prescription)}
        ${pdfBlock("Recomendaciones", record.recommendations)}
        <button onclick="window.print()">Imprimir / Guardar PDF</button>
      </body>
    </html>
  `);
  printWindow.document.close();
  printWindow.focus();
}

function renderInput(id, label, type, required) {
  return `
    <div>
      <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" for="${id}">${label}</label>
      <input id="${id}" type="${type}" ${required ? "required" : ""} class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100" />
    </div>
  `;
}

function renderTextarea(id, label, required, rows) {
  return `
    <div>
      <label class="mb-1 block text-xs font-semibold uppercase tracking-wide text-slate-500" for="${id}">${label}</label>
      <textarea id="${id}" rows="${rows}" ${required ? "required" : ""} class="w-full rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-emerald-500 focus:ring-4 focus:ring-emerald-100"></textarea>
    </div>
  `;
}

function renderRecordField(label, value) {
  return `<div><dt class="font-semibold text-slate-500">${label}</dt><dd class="mt-1 whitespace-pre-wrap text-slate-800">${value || "Sin información"}</dd></div>`;
}

function renderEmptyWorkspace() {
  return `
    <div class="grid min-h-[640px] place-items-center rounded-3xl border border-dashed border-slate-300 bg-slate-50 p-8 text-center">
      <div class="max-w-md">
        <div class="mx-auto grid h-20 w-20 place-items-center rounded-full bg-emerald-100 text-3xl">⚕</div>
        <h3 class="mt-5 text-2xl font-black text-slate-900">Selecciona un paciente</h3>
        <p class="mt-2 text-slate-500">La historia clínica se gestiona de forma independiente desde este módulo médico.</p>
      </div>
    </div>
  `;
}

function showClinicalMessage(container, message, type) {
  const messageBox = container.querySelector("#clinical-message");
  const classes = type === "success" ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700";

  messageBox.className = `mt-4 rounded-xl px-4 py-3 text-sm ${classes}`;
  messageBox.textContent = message;
}

function pdfField(label, value) {
  return `<div class="box"><div class="label">${label}</div>${value || "Sin información"}</div>`;
}

function pdfBlock(label, value) {
  return `<div class="box"><div class="label">${label}</div>${value || "Sin información"}</div>`;
}

function formatDate(timestamp) {
  if (!timestamp?.toDate) {
    return "Fecha no disponible";
  }

  return new Intl.DateTimeFormat("es-CO", {
    dateStyle: "medium",
    timeStyle: "short"
  }).format(timestamp.toDate());
}
