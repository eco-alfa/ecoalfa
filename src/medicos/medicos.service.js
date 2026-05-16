import {
  addDoc,
  collection,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

const DOCTORS_LIMIT = 100;

export async function getDoctors() {
  const doctorsQuery = query(collection(db, "doctors"), orderBy("fullName"), limit(DOCTORS_LIMIT));
  const snapshot = await getDocs(doctorsQuery);

  return snapshot.docs.map((doctorDoc) => ({
    id: doctorDoc.id,
    ...doctorDoc.data()
  }));
}

export async function upsertDoctor(doctorId, doctor) {
  const payload = {
    fullName: doctor.fullName.trim(),
    documentType: doctor.documentType,
    documentNumber: doctor.documentNumber.trim(),
    professionalLicense: doctor.professionalLicense.trim(),
    specialty: doctor.specialty.trim(),
    email: doctor.email.trim().toLowerCase(),
    phone: doctor.phone.trim(),
    address: doctor.address.trim(),
    schedule: doctor.schedule.trim(),
    active: doctor.active !== false,
    updatedAt: serverTimestamp()
  };

  if (doctorId) {
    await updateDoc(doc(db, "doctors", doctorId), payload);
    return doctorId;
  }

  const doctorRef = await addDoc(collection(db, "doctors"), {
    ...payload,
    createdAt: serverTimestamp()
  });

  return doctorRef.id;
}
