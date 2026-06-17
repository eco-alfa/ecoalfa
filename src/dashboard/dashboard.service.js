import {
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { ROLES } from "../auth/roles.js";
import { db } from "../firebase/config.js";

const KPI_LIMIT = 50;
const COLOMBIA_TIME_ZONE = "America/Bogota";
const DEBUG_DASHBOARD = true;

function debugDashboard(label, data = null) {
  if (!DEBUG_DASHBOARD) return;
  if (data instanceof Error) {
    console.error(`[Dashboard] ${label}`, {
      code: data.code,
      message: data.message,
      name: data.name,
      stack: data.stack
    });
    return;
  }
  console.log(`[Dashboard] ${label}`, data ?? "");
}

export async function getDashboardKpis(role) {
  debugDashboard("Iniciando carga de KPIs", { role });
  let inventory = { lowStock: [] };
  try {
    debugDashboard("Cargando inventario");
    inventory = await getInventorySnapshot();
    debugDashboard("Inventario cargado", { lowStock: inventory.lowStock.length });
  } catch (error) {
    console.warn("No se pudo cargar inventario:", error.message);
    debugDashboard("Error cargando inventario", error);
  }

  const canSeeOperationalDashboard = [ROLES.ADMIN, ROLES.MEDICO, ROLES.OPERADOR].includes(role);

  if (!canSeeOperationalDashboard) {
    debugDashboard("Vista limitada para rol no admin", { role });
    return {
      dailyIncome: 0,
      monthlyIncome: 0,
      attendedAppointments: 0,
      topMedicines: [],
      lowStock: inventory.lowStock,
      incomeByDay: buildEmptyIncomeByDay(),
      pendingAppointments: [],
      limited: true
    };
  }

  const invoices = await safeDashboardLoad("facturas recientes", getRecentInvoices, []);
  const attendedAppointments = await safeDashboardLoad("citas atendidas", getAttendedAppointments, []);
  const pendingAppointments = await safeDashboardLoad("citas pendientes de hoy", getPendingAppointmentsToday, []);

  return {
    dailyIncome: sumInvoicesByDate(invoices, getTodayKey()),
    monthlyIncome: sumInvoicesByMonth(invoices, getCurrentMonthKey()),
    attendedAppointments: attendedAppointments.length,
    topMedicines: getTopMedicines(invoices),
    lowStock: inventory.lowStock,
    incomeByDay: getIncomeByDay(invoices),
    pendingAppointments,
    limited: false
  };
}

async function safeDashboardLoad(label, loader, fallback) {
  try {
    debugDashboard(`Cargando ${label}`);
    const result = await loader();
    debugDashboard(`${label} cargado`, { total: Array.isArray(result) ? result.length : null });
    return result;
  } catch (error) {
    debugDashboard(`Error cargando ${label}`, error);
    return fallback;
  }
}

async function getRecentInvoices() {
  const invoicesQuery = query(
    collection(db, "invoices"),
    orderBy("createdAt", "desc"),
    limit(KPI_LIMIT)
  );
  const snapshot = await getDocs(invoicesQuery);

  return snapshot.docs.map((invoiceDoc) => ({
    id: invoiceDoc.id,
    ...invoiceDoc.data()
  }));
}

async function getAttendedAppointments() {
  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("status", "==", "Atendida"),
    limit(KPI_LIMIT)
  );
  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs.map((appointmentDoc) => ({
    id: appointmentDoc.id,
    ...appointmentDoc.data()
  }));
}

async function getPendingAppointmentsToday() {
  const today = getTodayKey();
  const statuses = ["Solicitada", "Programada", "Confirmada", "En espera", "En Sala de Espera"];
  const appointments = [];

  appointments.push(...await safePendingAppointmentsByField("dateKey", today, statuses));
  appointments.push(...await safePendingAppointmentsByField("date", today, statuses));

  if (!appointments.length) {
    appointments.push(...await safePendingAppointmentsByField("dateKey", today.replace(/-/g, ""), statuses));
  }

  return [...new Map(appointments.map((appointment) => [appointment.id, appointment])).values()]
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

async function safePendingAppointmentsByField(field, value, statuses) {
  try {
    return await getPendingAppointmentsByField(field, value, statuses);
  } catch (error) {
    debugDashboard(`No se pudo consultar citas por ${field}=${value}`, error);
    return [];
  }
}

async function getPendingAppointmentsByField(field, value, statuses) {
  const appointmentsQuery = query(
    collection(db, "appointments"),
    where(field, "==", value),
    where("status", "in", statuses),
    limit(20)
  );
  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs
    .map((appointmentDoc) => ({
      id: appointmentDoc.id,
      ...appointmentDoc.data()
    }))
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

async function getInventorySnapshot() {
  const inventoryQuery = query(
    collection(db, "inventory"),
    orderBy("name"),
    limit(KPI_LIMIT)
  );
  const snapshot = await getDocs(inventoryQuery);
  const medicines = snapshot.docs.map((medicineDoc) => ({
    id: medicineDoc.id,
    ...medicineDoc.data()
  }));

  return {
    lowStock: medicines.filter((medicine) => Number(medicine.stock || 0) <= Number(medicine.minStock || 0))
  };
}

function sumInvoicesByDate(invoices, dateKey) {
  return invoices
    .filter((invoice) => getTimestampDateKey(invoice.createdAt) === dateKey)
    .reduce((total, invoice) => total + Number(invoice.total || 0), 0);
}

function sumInvoicesByMonth(invoices, monthKey) {
  return invoices
    .filter((invoice) => getTimestampDateKey(invoice.createdAt).startsWith(monthKey))
    .reduce((total, invoice) => total + Number(invoice.total || 0), 0);
}

function getTopMedicines(invoices) {
  const totals = new Map();

  invoices.forEach((invoice) => {
    (invoice.items || [])
      .filter((item) => item.type === "medicine")
      .forEach((item) => {
        const current = totals.get(item.name) || 0;
        totals.set(item.name, current + Number(item.quantity || 0));
      });
  });

  return [...totals.entries()]
    .map(([name, quantity]) => ({ name, quantity }))
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 5);
}

function getIncomeByDay(invoices) {
  const days = buildEmptyIncomeByDay();

  invoices.forEach((invoice) => {
    const dateKey = getTimestampDateKey(invoice.createdAt);

    if (dateKey in days) {
      days[dateKey] += Number(invoice.total || 0);
    }
  });

  return days;
}

function buildEmptyIncomeByDay() {
  return Array.from({ length: 7 }).reduce((days, _, index) => {
    days[getColombiaDateKey(addDays(new Date(), index - 6))] = 0;
    return days;
  }, {});
}

function getTimestampDateKey(timestamp) {
  if (!timestamp?.toDate) {
    return "";
  }

  return getColombiaDateKey(timestamp.toDate());
}

function getTodayKey() {
  return getColombiaDateKey();
}

function getCurrentMonthKey() {
  return getTodayKey().slice(0, 7);
}

function addDays(date, days) {
  const copy = new Date(date);
  copy.setDate(copy.getDate() + days);
  return copy;
}

function getColombiaDateKey(date = new Date()) {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: COLOMBIA_TIME_ZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit"
  }).formatToParts(date).reduce((acc, part) => {
    acc[part.type] = part.value;
    return acc;
  }, {});

  return `${parts.year}-${parts.month}-${parts.day}`;
}
