import {
  addDoc,
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  orderBy,
  query,
  runTransaction,
  serverTimestamp,
  setDoc,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

const COLOMBIA_TIME_ZONE = "America/Bogota";
const ACTIVE_APPOINTMENT_STATUSES = ["Solicitada", "Programada", "Confirmada", "En espera", "En Sala de Espera"];

export const APPOINTMENT_STATUSES = [
  "Solicitada",
  "Programada",
  "Confirmada",
  "En Sala de Espera",
  "Atendida",
  "Cancelada"
];

export async function getAppointmentsByDate(dateKey, lastVisible = null) {
  const constraints = [
    where("dateKey", "==", dateKey)
  ];

  const appointmentsQuery = query(collection(db, "appointments"), ...constraints);
  const snapshot = await getDocs(appointmentsQuery);

  return {
    appointments: snapshot.docs.map((appointmentDoc) => ({
      id: appointmentDoc.id,
      ...appointmentDoc.data()
    })).sort((a, b) => String(a.time || "").localeCompare(String(b.time || ""))),
    lastVisible: snapshot.docs.at(-1) || null,
    hasMore: false
  };
}

export async function createAppointment(appointment) {
  await createAppointmentWithoutSlot(appointment);
}

export async function createAppointmentWithoutSlot(appointment) {
  await addDoc(collection(db, "appointments"), {
    ...appointment,
    status: appointment.status || "Programada",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateAppointment(appointmentId, changes, user = null) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const updateData = {
    ...changes,
    updatedAt: serverTimestamp()
  };
  
  if (user) {
    updateData.lastModifiedBy = {
      uid: user.uid,
      name: user.displayName || user.email,
      timestamp: serverTimestamp()
    };
  }
  
  await updateDoc(appointmentRef, updateData);
}

export async function updateAppointmentStatus(appointmentId, newStatus, user) {
  const appointmentRef = doc(db, "appointments", appointmentId);
  const appointmentSnap = await getDoc(appointmentRef);
  
  if (!appointmentSnap.exists()) {
    throw new Error("Cita no encontrada");
  }
  
  const updateData = {
    status: newStatus,
    updatedAt: serverTimestamp(),
    lastModifiedBy: {
      uid: user.uid,
      name: user.displayName || user.email,
      timestamp: serverTimestamp()
    }
  };
  
  const now = new Date();
  const timeString = now.toLocaleTimeString("es-CO", { timeZone: COLOMBIA_TIME_ZONE, hour: "2-digit", minute: "2-digit" });
  
  if (newStatus === "En Sala de Espera" && !appointmentSnap.data().arrivalTime) {
    updateData.arrivalTime = timeString;
    updateData.room = "Sala Principal";
  }
  
  if (newStatus === "Atendida" && !appointmentSnap.data().attendedTime) {
    updateData.attendedTime = timeString;
  }
  
  await updateDoc(appointmentRef, updateData);
}

export async function getPatients(searchTerm = "") {
  const patientsQuery = query(
    collection(db, "patients"),
    orderBy("fullName"),
    limit(50)
  );
  const snapshot = await getDocs(patientsQuery);
  
  const patients = snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  }));
  
  if (searchTerm) {
    const term = searchTerm.toLowerCase();
    return patients.filter((p) => 
      (p.fullName && p.fullName.toLowerCase().includes(term)) ||
      (p.documentNumber && p.documentNumber.includes(term))
    );
  }
  
  return patients;
}

export async function getDoctorsByRole() {
  const doctorsQuery = query(
    collection(db, "users"),
    where("role", "==", "medico"),
    where("active", "==", true),
    limit(50)
  );
  const snapshot = await getDocs(doctorsQuery);
  
  return snapshot.docs.map((doc) => ({
    id: doc.id,
    ...doc.data()
  })).sort((a, b) => String(a.displayName || a.email || "").localeCompare(String(b.displayName || b.email || "")));
}

export function buildSlotId(doctorId, dateKey, time) {
  return `${doctorId}_${dateKey.replaceAll("-", "")}_${time.replace(":", "")}`;
}

export async function createAvailabilitySlots({ doctorId, doctorName, dateKey, startTime, endTime, intervalMinutes }) {
  const slots = buildTimeSlots(startTime, endTime, Number(intervalMinutes || 30));

  await Promise.all(slots.map((time) => {
    const slotId = buildSlotId(doctorId, dateKey, time);
    return setDoc(doc(db, "appointmentSlots", slotId), {
      doctorId,
      doctorName,
      dateKey,
      time,
      status: "available",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    }, { merge: true });
  }));

  return slots.length;
}

export async function getAvailableSlots(doctorId, dateKey) {
  if (!doctorId || !dateKey) return [];

  const slotsQuery = query(
    collection(db, "appointmentSlots"),
    where("doctorId", "==", doctorId),
    where("dateKey", "==", dateKey),
    where("status", "==", "available"),
    limit(80)
  );
  const snapshot = await getDocs(slotsQuery);

  return snapshot.docs
    .map((slotDoc) => ({ id: slotDoc.id, ...slotDoc.data() }))
    .sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

export async function reserveAppointmentSlot(slotId, appointment) {
  return runTransaction(db, async (transaction) => {
    const slotRef = doc(db, "appointmentSlots", slotId);
    const slotSnap = await transaction.get(slotRef);

    if (!slotSnap.exists()) {
      throw new Error("slot-not-found");
    }

    const slot = slotSnap.data();
    if (slot.status !== "available") {
      throw new Error("slot-already-booked");
    }

    const appointmentRef = doc(collection(db, "appointments"));
    transaction.set(appointmentRef, {
      ...appointment,
      doctorId: slot.doctorId,
      doctorName: slot.doctorName,
      dateKey: slot.dateKey,
      time: slot.time,
      slotId,
      status: appointment.status || "Programada",
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp()
    });

    transaction.update(slotRef, {
      status: "booked",
      appointmentId: appointmentRef.id,
      patientId: appointment.patientId || "",
      patientName: appointment.patientName || appointment.fullName || "",
      authUid: appointment.authUid || "",
      updatedAt: serverTimestamp()
    });

    return appointmentRef.id;
  });
}

function buildTimeSlots(startTime, endTime, intervalMinutes) {
  const [startHour, startMinute] = startTime.split(":").map(Number);
  const [endHour, endMinute] = endTime.split(":").map(Number);
  const start = startHour * 60 + startMinute;
  const end = endHour * 60 + endMinute;
  const slots = [];

  for (let minute = start; minute < end; minute += intervalMinutes) {
    const hour = Math.floor(minute / 60);
    const mins = minute % 60;
    slots.push(`${String(hour).padStart(2, "0")}:${String(mins).padStart(2, "0")}`);
  }

  return slots;
}

export async function getTodayAppointmentsForDoctor(doctorId) {
  const dateKey = getTodayKey();
  const appointments = await getAppointmentsForDoctorByDateKey(doctorId, dateKey);
  const compactDateKey = dateKey.replaceAll("-", "");

  if (compactDateKey === dateKey) {
    return appointments;
  }

  try {
    const legacyAppointments = await getAppointmentsForDoctorByDateKey(doctorId, compactDateKey);
    const appointmentsById = new Map([...appointments, ...legacyAppointments].map((appointment) => [appointment.id, appointment]));
    return [...appointmentsById.values()].sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
  } catch (error) {
    return appointments;
  }
}

async function getAppointmentsForDoctorByDateKey(doctorId, dateKey) {
  const appointmentsQuery = query(
    collection(db, "appointments"),
    where("dateKey", "==", dateKey),
    where("doctorId", "==", doctorId),
    where("status", "in", ACTIVE_APPOINTMENT_STATUSES)
  );

  const snapshot = await getDocs(appointmentsQuery);

  return snapshot.docs.map((appointmentDoc) => ({
    id: appointmentDoc.id,
    ...appointmentDoc.data()
  })).sort((a, b) => String(a.time || "").localeCompare(String(b.time || "")));
}

function getTodayKey() {
  return getColombiaDateKey();
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
