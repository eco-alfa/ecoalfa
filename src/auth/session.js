import { listenAuthState } from "../firebase/auth.js";
import { getUserProfile } from "../firebase/db.js";

let currentSession = {
  user: null,
  profile: null,
  error: null
};

export function getSession() {
  return currentSession;
}

export function subscribeSession(callback) {
  return listenAuthState(async (user) => {
    if (!user) {
      currentSession = {
        user: null,
        profile: null,
        error: null
      };
      callback(currentSession);
      return;
    }

    try {
      const profile = await getUserProfile(user.uid);

      currentSession = {
        user,
        profile,
        error: null
      };
    } catch (error) {
      currentSession = {
        user,
        profile: null,
        error
      };
    }

    callback(currentSession);
  });
}
