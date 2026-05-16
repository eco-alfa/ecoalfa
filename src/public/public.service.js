import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

export async function getPublicDoctors() {
  const doctorsQuery = query(collection(db, "doctors"), orderBy("fullName"), limit(50));
  const snapshot = await getDocs(doctorsQuery);

  return snapshot.docs
    .map((doctorDoc) => ({ id: doctorDoc.id, ...doctorDoc.data() }))
    .filter((doctor) => doctor.active !== false);
}

export async function createPublicAppointmentRequest(request) {
  const firstName = request.firstName.trim();
  const middleName = request.middleName.trim();
  const firstLastName = request.firstLastName.trim();
  const secondLastName = request.secondLastName.trim();
  const fullName = [firstName, middleName, firstLastName, secondLastName].filter(Boolean).join(" ");

  await addDoc(collection(db, "publicAppointmentRequests"), {
    documentType: request.documentType,
    documentNumber: request.documentNumber.trim(),
    firstName,
    middleName,
    firstLastName,
    secondLastName,
    fullName,
    email: request.email.trim().toLowerCase(),
    phone: request.phone.trim(),
    address: request.address.trim(),
    neighborhood: request.neighborhood.trim(),
    municipality: request.municipality.trim(),
    gender: request.gender,
    customGender: request.customGender.trim(),
    doctorId: request.doctorId,
    doctorName: request.doctorName,
    requestedDate: request.requestedDate,
    requestedTime: request.requestedTime,
    reason: request.reason.trim(),
    status: "Solicitada",
    source: "public",
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
