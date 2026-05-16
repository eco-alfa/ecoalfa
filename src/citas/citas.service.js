import {
  addDoc,
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

const APPOINTMENTS_PAGE_SIZE = 20;

export const APPOINTMENT_STATUSES = [
  "Programada",
  "Confirmada",
  "En Sala de Espera",
  "Atendida",
  "Cancelada"
];

export async function getAppointmentsByDate(dateKey, lastVisible = null) {
  const constraints = [
    where("dateKey", "==", dateKey),
    orderBy("time", "asc"),
    limit(APPOINTMENTS_PAGE_SIZE)
  ];

  if (lastVisible) {
    constraints.splice(2, 0, startAfter(lastVisible));
  }

  const appointmentsQuery = query(collection(db, "appointments"), ...constraints);
  const snapshot = await getDocs(appointmentsQuery);

  return {
    appointments: snapshot.docs.map((appointmentDoc) => ({
      id: appointmentDoc.id,
      ...appointmentDoc.data()
    })),
    lastVisible: snapshot.docs.at(-1) || null,
    hasMore: snapshot.docs.length === APPOINTMENTS_PAGE_SIZE
  };
}

export async function createAppointment(appointment) {
  await addDoc(collection(db, "appointments"), {
    ...appointment,
    status: appointment.status || "Programada",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}

export async function updateAppointment(appointmentId, changes) {
  const appointmentRef = doc(db, "appointments", appointmentId);

  await updateDoc(appointmentRef, {
    ...changes,
    updatedAt: serverTimestamp()
  });
}
