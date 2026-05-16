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

const PATIENTS_PAGE_SIZE = 15;
const RECORDS_PAGE_SIZE = 10;

export async function getPatientsPage(lastVisible = null) {
  const constraints = [orderBy("fullName"), limit(PATIENTS_PAGE_SIZE)];

  if (lastVisible) {
    constraints.splice(1, 0, startAfter(lastVisible));
  }

  const patientsQuery = query(collection(db, "patients"), ...constraints);
  const snapshot = await getDocs(patientsQuery);

  return {
    patients: snapshot.docs.map((patientDoc) => ({
      id: patientDoc.id,
      ...patientDoc.data()
    })),
    lastVisible: snapshot.docs.at(-1) || null,
    hasMore: snapshot.docs.length === PATIENTS_PAGE_SIZE
  };
}

export async function searchPatientsByDocument(documentNumber) {
  const patientsQuery = query(
    collection(db, "patients"),
    where("documentNumber", "==", documentNumber.trim()),
    limit(10)
  );
  const snapshot = await getDocs(patientsQuery);

  return snapshot.docs.map((patientDoc) => ({
    id: patientDoc.id,
    ...patientDoc.data()
  }));
}

export async function upsertPatient(patientId, patient) {
  const payload = {
    fullName: patient.fullName.trim(),
    documentNumber: patient.documentNumber.trim(),
    phone: patient.phone.trim(),
    email: patient.email.trim().toLowerCase(),
    birthDate: patient.birthDate,
    address: patient.address.trim(),
    background: patient.background.trim(),
    updatedAt: serverTimestamp()
  };

  if (patientId) {
    await updateDoc(doc(db, "patients", patientId), payload);
    return patientId;
  }

  const patientRef = await addDoc(collection(db, "patients"), {
    ...payload,
    createdAt: serverTimestamp()
  });

  return patientRef.id;
}

export async function getClinicalRecords(patientId, lastVisible = null) {
  const constraints = [orderBy("createdAt", "desc"), limit(RECORDS_PAGE_SIZE)];

  if (lastVisible) {
    constraints.splice(1, 0, startAfter(lastVisible));
  }

  const recordsQuery = query(collection(db, "patients", patientId, "clinicalRecords"), ...constraints);
  const snapshot = await getDocs(recordsQuery);

  return {
    records: snapshot.docs.map((recordDoc) => ({
      id: recordDoc.id,
      ...recordDoc.data()
    })),
    lastVisible: snapshot.docs.at(-1) || null,
    hasMore: snapshot.docs.length === RECORDS_PAGE_SIZE
  };
}

export async function createClinicalRecord(patientId, record) {
  await addDoc(collection(db, "patients", patientId, "clinicalRecords"), {
    reason: record.reason.trim(),
    currentIllness: record.currentIllness.trim(),
    systemsReview: record.systemsReview.trim(),
    diagnosis: record.diagnosis.trim(),
    prescription: record.prescription.trim(),
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
}
