import {
  collection,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  serverTimestamp,
  setDoc,
  startAfter,
  updateDoc
} from "https://www.gstatic.com/firebasejs/10.12.5/firebase-firestore.js";
import { db } from "../firebase/config.js";

const USERS_PAGE_SIZE = 10;

export async function getUsersPage(lastVisible = null) {
  const constraints = [orderBy("displayName"), limit(USERS_PAGE_SIZE)];

  if (lastVisible) {
    constraints.splice(1, 0, startAfter(lastVisible));
  }

  const usersQuery = query(collection(db, "users"), ...constraints);
  const snapshot = await getDocs(usersQuery);

  return {
    users: snapshot.docs.map((userDoc) => ({
      id: userDoc.id,
      ...userDoc.data()
    })),
    lastVisible: snapshot.docs.at(-1) || null,
    hasMore: snapshot.docs.length === USERS_PAGE_SIZE
  };
}

export async function upsertUserProfile(uid, profile) {
  const now = serverTimestamp();
  const userRef = doc(db, "users", uid);

  await setDoc(userRef, {
    uid,
    email: profile.email.trim().toLowerCase(),
    displayName: profile.displayName.trim(),
    role: profile.role,
    active: profile.active,
    createdAt: now,
    updatedAt: now
  }, { merge: true });
}

export async function updateUserProfile(uid, changes) {
  const userRef = doc(db, "users", uid);

  await updateDoc(userRef, {
    ...changes,
    updatedAt: serverTimestamp()
  });
}
