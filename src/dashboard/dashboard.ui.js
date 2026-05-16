import { getSession } from "../auth/session.js";
import { getDashboardKpis } from "./dashboard.service.js";

let dashboardChart = null;

export async function renderDashboardModule(container) {
  container.innerHTML = renderLoading();

  try {
    const role = getSession().profile?.role;
    const kpis = await getDashboardKpis(role);
    container.innerHTML = renderDashboard(kpis);
    renderIncomeChart(kpis.incomeByDay);
  } catch (error) {
    container.innerHTML = `
      <section class="rounded-2xl bg-white p-8 text-center shadow-sm ring-1 ring-slate-200">
        <h2 class="text-2xl font-bold text-slate-900">No fue posible cargar el dashboard</h2>
        <p class="mt-2 text-slate-500">Verifica permisos, índices de Firestore o datos iniciales.</p>
      </section>
    `;
  }
}

function renderLoading() {
  return `
    <section class="rounded-2xl bg-white p-8 shadow-sm ring-1 ring-slate-200">
      <p class="text-sm text-slate-500">Cargando indicadores...</p>
    </section>
  `;
}

function renderDashboard(kpis) {
  return `
    <section class="space-y-6">
      <div class="flex flex-col justify-between gap-3 lg:flex-row lg:items-center">
        <div>
          <h2 class="text-2xl font-bold text-slate-900">Dashboard</h2>
          <p class="text-slate-500">Indicadores operativos calculados con consultas limitadas.</p>
        </div>
        ${kpis.limited ? `<span class="rounded-full bg-amber-50 px-4 py-2 text-sm font-medium text-amber-700">Vista limitada para asesor</span>` : ""}
      </div>

      <div class="grid gap-4 md:grid-cols-4">
        ${renderMetricCard("Ingresos diarios", `$${formatCurrency(kpis.dailyIncome)}`, "Facturas recientes")}
        ${renderMetricCard("Ingresos mensuales", `$${formatCurrency(kpis.monthlyIncome)}`, "Últimas 50 facturas")}
        ${renderMetricCard("Citas atendidas", kpis.attendedAppointments, "Últimas 50 atendidas")}
        ${renderMetricCard("Stock bajo", kpis.lowStock.length, "Primeros 50 medicamentos")}
      </div>

      <div class="grid gap-6 xl:grid-cols-[1fr_380px]">
        <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
          <h3 class="mb-4 text-lg font-semibold text-slate-900">Ingresos últimos 7 días</h3>
          <canvas id="income-chart" height="120"></canvas>
        </div>

        <div class="space-y-6">
          <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 class="text-lg font-semibold text-slate-900">Medicamentos más vendidos</h3>
            <div class="mt-4 space-y-3">
              ${renderTopMedicines(kpis.topMedicines)}
            </div>
          </div>

          <div class="rounded-2xl bg-white p-6 shadow-sm ring-1 ring-slate-200">
            <h3 class="text-lg font-semibold text-slate-900">Alertas de stock bajo</h3>
            <div class="mt-4 space-y-3">
              ${renderLowStock(kpis.lowStock)}
            </div>
          </div>
        </div>
      </div>
    </section>
  `;
}

function renderMetricCard(title, value, helper) {
  return `
    <article class="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <p class="text-sm font-medium text-slate-500">${title}</p>
      <strong class="mt-2 block text-3xl text-slate-900">${value}</strong>
      <span class="mt-2 block text-xs text-slate-400">${helper}</span>
    </article>
  `;
}

function renderTopMedicines(medicines) {
  if (!medicines.length) {
    return `<p class="text-sm text-slate-500">Sin ventas de medicamentos registradas.</p>`;
  }

  return medicines.map((medicine) => `
    <div class="flex justify-between rounded-xl bg-slate-50 px-4 py-3 text-sm">
      <span class="font-medium text-slate-800">${medicine.name}</span>
      <span class="text-slate-500">${medicine.quantity}</span>
    </div>
  `).join("");
}

function renderLowStock(medicines) {
  if (!medicines.length) {
    return `<p class="text-sm text-slate-500">Sin alertas de stock bajo.</p>`;
  }

  return medicines.slice(0, 8).map((medicine) => `
    <div class="rounded-xl bg-red-50 px-4 py-3 text-sm text-red-800">
      <strong>${medicine.name} ${medicine.potency || ""}</strong>
      <span class="block text-red-600">Stock ${medicine.stock || 0} / mínimo ${medicine.minStock || 0}</span>
    </div>
  `).join("");
}

function renderIncomeChart(incomeByDay) {
  const canvas = document.querySelector("#income-chart");

  if (!canvas || !window.Chart) {
    return;
  }

  if (dashboardChart) {
    dashboardChart.destroy();
  }

  const labels = Object.keys(incomeByDay);
  const values = Object.values(incomeByDay);

  dashboardChart = new Chart(canvas, {
    type: "line",
    data: {
      labels,
      datasets: [
        {
          label: "Ingresos",
          data: values,
          borderColor: "#047857",
          backgroundColor: "rgba(4, 120, 87, 0.12)",
          tension: 0.35,
          fill: true
        }
      ]
    },
    options: {
      responsive: true,
      plugins: {
        legend: {
          display: false
        }
      },
      scales: {
        y: {
          beginAtZero: true
        }
      }
    }
  });
}

function formatCurrency(value) {
  return Number(value || 0).toLocaleString("es-CO");
}
