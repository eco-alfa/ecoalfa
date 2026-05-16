import { listenAuthState } from "../firebase/auth.js";
import { getUserProfile } from "../firebase/db.js";

let currentSession = {
  user: null,
  profile: null
};

export function getSession() {
  return currentSession;
}

export function subscribeSession(callback) {
  return listenAuthState(async (user) => {
    if (!user) {
      currentSession = {
        user: null,
        profile: null
      };
      callback(currentSession);
      return;
    }

    const profile = await getUserProfile(user.uid);

    currentSession = {
      user,
      profile
    };

    callback(currentSession);
  });
}
