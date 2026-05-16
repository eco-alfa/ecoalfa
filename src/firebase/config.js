import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyBs85ZtM0tUI5XYypWTze-8xfPJj3EaV5g",
  authDomain: "ecoalfa-6f9d1.firebaseapp.com",
  projectId: "ecoalfa-6f9d1",
  storageBucket: "ecoalfa-6f9d1.firebasestorage.app",
  messagingSenderId: "760816764581",
  appId: "1:760816764581:web:31ef204b23ca5980852f4c",
  measurementId: "G-77WWNZFNY6"
};

export const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
