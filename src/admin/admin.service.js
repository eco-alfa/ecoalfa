import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-storage.js";
import { db, app } from "../firebase/config.js";

const storage = getStorage(app);
const CONFIG_DOC = "siteConfig";

export async function getSiteConfig() {
  const configRef = doc(db, "config", CONFIG_DOC);
  const snapshot = await getDoc(configRef);

  if (!snapshot.exists()) {
    return getDefaultConfig();
  }

  return { ...getDefaultConfig(), ...snapshot.data() };
}

export async function saveSiteConfig(config, user) {
  const configRef = doc(db, "config", CONFIG_DOC);

  await setDoc(configRef, {
    ...config,
    updatedAt: serverTimestamp(),
    updatedBy: {
      uid: user?.uid || "",
      name: user?.displayName || user?.email || ""
    }
  }, { merge: true });
}

export async function uploadPromotionalFile(file, folder = "promos") {
  if (!file) {
    throw new Error("No se proporcionó un archivo");
  }

  const fileName = `${folder}/${Date.now()}_${file.name}`;
  const fileRef = ref(storage, fileName);
  await uploadBytes(fileRef, file);
  const downloadUrl = await getDownloadURL(fileRef);

  return { url: downloadUrl, path: fileName, name: file.name, type: file.type };
}

function getDefaultConfig() {
  return {
    companyName: "Ecoalfa",
    slogan: "su salud es lo más importante",
    phone: "322 897 1484",
    whatsappNumber: "573228971484",
    email: "",
    address: "Colombia",
    timezone: "Bogotá",
    heroTitle: "Tu salud en las mejores manos",
    heroHighlight: "mejores manos",
    heroDescription: "En Ecoalfa te acompañamos con una atención cercana, clara y personalizada. Agenda tu cita, resuelve tus dudas y recibe orientación pensada para tu bienestar.",
    primaryButtonText: "Agendar por WhatsApp",
    secondaryButtonText: "Ingresar al portal",
    ctaTitle: "Da el primer paso hacia tu bienestar",
    ctaDescription: "Estamos en Colombia y trabajamos con hora Bogotá para que tus citas, recordatorios y atención médica estén siempre alineados correctamente.",
    showPromoModal: true,
    promoAutoPlay: true,
    promoInterval: 5000,
    promoItems: []
  };
}
