// firebase-config.js
// Beitou Roots Research — subscriber backend (dedicated Firebase project "Research").
//
// NOTE: these web-config values are PUBLIC by design. A Firebase web apiKey only
// identifies the project; it is NOT a secret. All security is enforced by the
// Firestore security rules (firestore.rules), never by hiding this file.
//
// Fill the 4 __FILL_ME__ values from:
//   Firebase console -> Project settings -> General -> Your apps -> Web app -> "SDK setup and configuration" -> Config.
export const firebaseConfig = {
  apiKey: "AIzaSyAyeLq_FvnrMLVb41_p0v1PILqW7geGA4M",
  authDomain: "beitou-roots-research.firebaseapp.com",
  projectId: "beitou-roots-research",
  appId: "1:338764653765:web:890c8eaa71fbb8ef3c7cac"
};

// Who can open the admin console (must match the Google account you sign in with).
export const ADMIN_EMAIL = "mel@beitouroots.com";

// Firestore collection that holds subscribers.
export const COLLECTION = "buzz_subscribers";
