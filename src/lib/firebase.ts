import type * as AuthMod from "firebase/auth";
import type * as FsMod from "firebase/firestore/lite";

/**
 * Uses the "lite" Firestore SDK: plain request/response (get/set/delete/batch), a fraction of the size of the
 * full SDK, and a failed save reports an error instead of waiting forever when offline.
 * Config comes from .env (VITE_FIREBASE_*), see .env.example.
 */
const env = import.meta.env;
const config = {
  apiKey: env["VITE_FIREBASE_API_KEY"],
  authDomain: env["VITE_FIREBASE_AUTH_DOMAIN"],
  projectId: env["VITE_FIREBASE_PROJECT_ID"],
  storageBucket: env["VITE_FIREBASE_STORAGE_BUCKET"],
  messagingSenderId: env["VITE_FIREBASE_MESSAGING_SENDER_ID"],
  appId: env["VITE_FIREBASE_APP_ID"],
};

export const firebaseConfigured = Boolean(config.apiKey && config.authDomain && config.projectId && config.appId);

export class FirebaseNotConfiguredError extends Error {
  constructor() {
    super("Firebase is not configured. Add your VITE_FIREBASE_* values to .env and restart the dev server.");
    this.name = "FirebaseNotConfiguredError";
  }
}

export interface FirebaseHandle {
  auth: AuthMod.Auth;
  db: FsMod.Firestore;
  A: typeof AuthMod;
  F: typeof FsMod;
}

let cached: Promise<FirebaseHandle> | null = null;

export function loadFirebase(): Promise<FirebaseHandle> {
  if (typeof window === "undefined") return Promise.reject(new Error("Firebase only runs in the browser."));
  if (!firebaseConfigured) return Promise.reject(new FirebaseNotConfiguredError());
  cached ??= (async () => {
    const [{ initializeApp, getApps, getApp }, A, F] = await Promise.all([
      import("firebase/app"),
      import("firebase/auth"),
      import("firebase/firestore/lite"),
    ]);
    const app = getApps().length ? getApp() : initializeApp(config);
    return { auth: A.getAuth(app), db: F.getFirestore(app), A, F };
  })().catch((e) => {
    cached = null;
    throw e;
  });
  return cached;
}