import {
  addDoc,
  collection,
  doc,
  getDocs,
  query,
  serverTimestamp,
  updateDoc,
  where
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

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
