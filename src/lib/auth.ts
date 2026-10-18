import type { User as FbUser } from "firebase/auth";
import { create } from "zustand";
import { FirebaseNotConfiguredError, firebaseConfigured, loadFirebase } from "./firebase";

/**
 * Accounts are handled by Firebase Authentication (email + password).
 * Firebase stores the account (email, hashed password, uid) on Google's servers — this app
 * never sees or stores a password. Each account's designs live in Firestore under
 * `users/<uid>/designs/<designId>` (see store.ts) and `firestore.rules` lets a user touch only their own.
 */

export interface User {
  id: string;
  name: string;
  email: string;
  createdAt: number;
}

export class AuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "AuthError";
  }
}

/* ---------- validation ---------- */

export const normalizeEmail = (e: string) => e.trim().toLowerCase();
export const isValidEmail = (e: string) => /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(normalizeEmail(e));

export function passwordProblem(p: string): string | null {
  if (p.length < 8) return "Password must be at least 8 characters.";
  if (!/[A-Za-z]/.test(p) || !/\d/.test(p)) return "Password must contain a letter and a number.";
  return null;
}

/* ---------- errors ---------- */

const MESSAGES: Record<string, string> = {
  "auth/email-already-in-use": "An account with this email already exists. Try logging in.",
  "auth/invalid-email": "Please enter a valid email address.",
  "auth/weak-password": "That password is too weak. Use at least 8 characters with a letter and a number.",
  "auth/invalid-credential": "Incorrect email or password.",
  "auth/wrong-password": "Incorrect email or password.",
  "auth/user-not-found": "Incorrect email or password.",
  "auth/user-disabled": "This account has been disabled.",
  "auth/too-many-requests": "Too many attempts. Please wait a few minutes and try again.",
  "auth/network-request-failed": "Network problem. Check your internet connection and try again.",
  "auth/requires-recent-login": "For security, please log in again and retry.",
  "auth/operation-not-allowed": "Email/password sign-in is not enabled in your Firebase project.",
  "permission-denied": "You do not have permission to do that. Check your Firestore rules.",
};

export function mapAuthError(e: unknown): AuthError {
  if (e instanceof AuthError) return e;
  if (e instanceof FirebaseNotConfiguredError) return new AuthError(e.message);
  const code = (e as { code?: string } | null)?.code ?? "";
  return new AuthError(MESSAGES[code] ?? "Something went wrong. Please try again.");
}

/* ---------- helpers ---------- */

export function toUser(u: FbUser): User {
  return {
    id: u.uid,
    name: u.displayName || u.email?.split("@")[0] || "Friend",
    email: u.email ?? "",
    createdAt: u.metadata.creationTime ? Date.parse(u.metadata.creationTime) : Date.now(),
  };
}

/* ---------- actions ---------- */

export async function signUp(input: { name: string; email: string; password: string; remember?: boolean }): Promise<User> {
  const name = input.name.trim();
  const email = normalizeEmail(input.email);
  if (name.length < 2) throw new AuthError("Please enter your name.");
  if (!isValidEmail(email)) throw new AuthError("Please enter a valid email address.");
  const problem = passwordProblem(input.password);
  if (problem) throw new AuthError(problem);
  try {
    const { auth, A } = await loadFirebase();
    await A.setPersistence(auth, input.remember === false ? A.browserSessionPersistence : A.browserLocalPersistence);
    const cred = await A.createUserWithEmailAndPassword(auth, email, input.password);
    await A.updateProfile(cred.user, { displayName: name });
    return toUser(cred.user);
  } catch (e) {
    throw mapAuthError(e);
  }
}

export async function signIn(input: { email: string; password: string; remember?: boolean }): Promise<User> {
  const email = normalizeEmail(input.email);
  if (!email || !input.password) throw new AuthError("Enter your email and password.");
  try {
    const { auth, A } = await loadFirebase();
    await A.setPersistence(auth, input.remember === false ? A.browserSessionPersistence : A.browserLocalPersistence);
    const cred = await A.signInWithEmailAndPassword(auth, email, input.password);
    return toUser(cred.user);
  } catch (e) {
    throw mapAuthError(e);
  }
}

export async function signOut() {
  try {
    const { auth, A } = await loadFirebase();
    await A.signOut(auth);
  } catch (e) {
    throw mapAuthError(e);
  }
}

/** Sends a reset link. Always "succeeds" for unknown emails so accounts cannot be probed. */
export async function resetPassword(email: string) {
  const clean = normalizeEmail(email);
  if (!isValidEmail(clean)) throw new AuthError("Enter your email address first.");
  try {
    const { auth, A } = await loadFirebase();
    await A.sendPasswordResetEmail(auth, clean);
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "auth/user-not-found") return;
    throw mapAuthError(e);
  }
}

async function reauth(password: string) {
  const { auth, A } = await loadFirebase();
  const u = auth.currentUser;
  if (!u?.email) throw new AuthError("You are not signed in.");
  try {
    await A.reauthenticateWithCredential(u, A.EmailAuthProvider.credential(u.email, password));
  } catch (e) {
    const code = (e as { code?: string } | null)?.code;
    if (code === "auth/invalid-credential" || code === "auth/wrong-password") throw new AuthError("Password is incorrect.");
    throw mapAuthError(e);
  }
  return { auth, A, user: u };
}

export async function updateName(name: string): Promise<User> {
  const clean = name.trim();
  if (clean.length < 2) throw new AuthError("Please enter your name.");
  try {
    const { auth, A } = await loadFirebase();
    if (!auth.currentUser) throw new AuthError("You are not signed in.");
    await A.updateProfile(auth.currentUser, { displayName: clean });
    return toUser(auth.currentUser);
  } catch (e) {
    throw mapAuthError(e);
  }
}

export async function changePassword(oldPassword: string, newPassword: string) {
  const problem = passwordProblem(newPassword);
  if (problem) throw new AuthError(problem);
  try {
    const { A, user } = await reauth(oldPassword);
    await A.updatePassword(user, newPassword);
  } catch (e) {
    throw mapAuthError(e);
  }
}

/** Verifies the password, runs `cleanup` (delete the user's data), then deletes the account. */
export async function deleteAccount(password: string, cleanup: (uid: string) => Promise<void>) {
  try {
    const { A, user } = await reauth(password);
    await cleanup(user.uid);
    await A.deleteUser(user);
  } catch (e) {
    throw mapAuthError(e);
  }
}

/* ---------- reactive store ---------- */

interface AuthState {
  user: User | null;
  /** false until Firebase has told us whether someone is signed in (avoids a login-page flash on refresh). */
  ready: boolean;
  /** Starts listening to Firebase. Returns an unsubscribe function. */
  init: () => () => void;
  signUp: (i: { name: string; email: string; password: string; remember?: boolean }) => Promise<User>;
  signIn: (i: { email: string; password: string; remember?: boolean }) => Promise<User>;
  signOut: () => Promise<void>;
  updateName: (name: string) => Promise<void>;
  changePassword: (oldPassword: string, newPassword: string) => Promise<void>;
  deleteAccount: (password: string, cleanup: (uid: string) => Promise<void>) => Promise<void>;
}

export const useAuth = create<AuthState>((set) => ({
  user: null,
  ready: false,
  init: () => {
    if (!firebaseConfigured) {
      set({ user: null, ready: true });
      return () => {};
    }
    let off = () => {};
    let stopped = false;
    loadFirebase()
      .then(({ auth, A }) => {
        if (stopped) return;
        off = A.onAuthStateChanged(auth, (u) => set({ user: u ? toUser(u) : null, ready: true }));
      })
      .catch(() => set({ user: null, ready: true }));
    return () => {
      stopped = true;
      off();
    };
  },
  signUp: async (input) => {
    const user = await signUp(input);
    set({ user, ready: true });
    return user;
  },
  signIn: async (input) => {
    const user = await signIn(input);
    set({ user, ready: true });
    return user;
  },
  signOut: async () => {
    await signOut();
    set({ user: null });
  },
  updateName: async (name) => set({ user: await updateName(name) }),
  changePassword: (o, n) => changePassword(o, n),
  deleteAccount: async (password, cleanup) => {
    await deleteAccount(password, cleanup);
    set({ user: null });
  },
}));
