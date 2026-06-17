import {
  collection,
  doc,
  getDocs,
  increment,
  limit,
  orderBy,
  query,
  serverTimestamp,
  writeBatch
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

const POS_MEDICINES_LIMIT = 50;

export const PAYMENT_TYPES = ["Efectivo", "Tarjeta", "Transferencia"];

export async function getPosMedicines() {
  const medicinesQuery = query(
    collection(db, "inventory"),
    orderBy("name"),
    limit(POS_MEDICINES_LIMIT)
  );
  const snapshot = await getDocs(medicinesQuery);

  return snapshot.docs.map((medicineDoc) => ({
    id: medicineDoc.id,
    ...medicineDoc.data()
  }));
}

export async function searchBillingPatients(searchTerm = "") {
  const patientsQuery = query(
    collection(db, "patients"),
    orderBy("fullName"),
    limit(80)
  );
  const snapshot = await getDocs(patientsQuery);
  const normalizedTerm = searchTerm.trim().toLowerCase();

  return snapshot.docs
    .map((patientDoc) => ({
      id: patientDoc.id,
      ...patientDoc.data()
    }))
    .filter((patient) => !normalizedTerm ||
      String(patient.fullName || "").toLowerCase().includes(normalizedTerm) ||
      String(patient.documentNumber || "").toLowerCase().includes(normalizedTerm)
    )
    .slice(0, 12);
}

export async function createInvoice(invoice) {
  const batch = writeBatch(db);
  const invoiceRef = doc(collection(db, "invoices"));
  const now = serverTimestamp();

  batch.set(invoiceRef, {
    number: invoice.number,
    patientId: invoice.patientId || "",
    authUid: invoice.authUid || "",
    customerDocument: invoice.customerDocument || "",
    customerName: invoice.customerName.trim() || "Consumidor final",
    paymentType: invoice.paymentType,
    items: invoice.items,
    subtotal: invoice.subtotal,
    total: invoice.total,
    createdAt: now,
    updatedAt: now
  });

  invoice.items
    .filter((item) => item.type === "medicine")
    .forEach((item) => {
      const medicineRef = doc(db, "inventory", item.medicineId);
      const movementRef = doc(collection(db, "inventory", item.medicineId, "movements"));
      const quantity = Number(item.quantity || 0);

      batch.update(medicineRef, {
        stock: increment(quantity * -1),
        updatedAt: now
      });

      batch.set(movementRef, {
        type: "salida",
        quantity,
        signedQuantity: quantity * -1,
        note: `Factura ${invoice.number}`,
        invoiceId: invoiceRef.id,
        createdAt: now
      });
    });

  await batch.commit();

  return invoiceRef.id;
}
